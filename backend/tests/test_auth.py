"""Login, sessão, logout e proteção de origem."""

from collections.abc import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from app.auth.models import User, UserRole
from app.auth.service import SESSION_COOKIE_NAME
from app.database import utc_now
from tests.conftest import TEST_PASSWORD


def test_login_creates_session_and_me_returns_user(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user("maria@example.test", display_name="Maria Silva")

    response = client.post(
        "/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "display_name": "Maria Silva",
        "email": "maria@example.test",
        "role": "REQUESTER",
    }
    assert client.cookies.get(SESSION_COOKIE_NAME)
    assert client.get("/api/auth/me").json()["email"] == "maria@example.test"


def test_login_cookie_uses_protective_flags(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user("maria@example.test")

    response = client.post(
        "/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD}
    )

    set_cookie_header = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie_header
    assert "SameSite=lax" in set_cookie_header
    assert "Path=/" in set_cookie_header


def test_session_token_is_never_stored_in_plain_text(
    client: TestClient, create_user: Callable[..., User], db_session: DbSession
) -> None:
    create_user("maria@example.test")
    client.post("/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD})

    stored_hash = db_session.execute(text("SELECT token_hash FROM sessions")).scalar_one()
    assert stored_hash != client.cookies.get(SESSION_COOKIE_NAME)
    assert len(stored_hash) == 64


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("maria@example.test", "senha-errada"),
        ("ninguem@example.test", TEST_PASSWORD),
        ("inativa@example.test", TEST_PASSWORD),
    ],
)
def test_failed_login_answers_the_same_way(
    client: TestClient, create_user: Callable[..., User], email: str, password: str
) -> None:
    create_user("maria@example.test")
    create_user("inativa@example.test", is_active=False)

    response = client.post("/api/auth/login", json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"
    assert response.json()["detail"]["message"] == "E-mail ou senha inválidos."


def test_me_without_session_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"


def test_expired_session_is_rejected(
    client: TestClient, create_user: Callable[..., User], db_session: DbSession
) -> None:
    create_user("maria@example.test")
    client.post("/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD})
    db_session.execute(
        text("UPDATE sessions SET expires_at = :moment"),
        {"moment": utc_now().isoformat(sep=" ")},
    )
    db_session.commit()

    assert client.get("/api/auth/me").status_code == 401


def test_deactivated_user_loses_access_with_a_valid_cookie(
    client: TestClient, create_user: Callable[..., User], db_session: DbSession
) -> None:
    create_user("maria@example.test")
    client.post("/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD})
    db_session.execute(text("UPDATE users SET is_active = 0"))
    db_session.commit()

    assert client.get("/api/auth/me").status_code == 401


def test_logout_invalidates_session_and_is_idempotent(
    client: TestClient, create_user: Callable[..., User]
) -> None:
    create_user("maria@example.test")
    client.post("/api/auth/login", json={"email": "maria@example.test", "password": TEST_PASSWORD})

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/logout").status_code == 204


def test_mutation_from_another_origin_is_refused(
    app: FastAPI, create_user: Callable[..., User], sign_in: Callable[..., TestClient]
) -> None:
    agent = create_user("agente@example.test", role=UserRole.AGENT)
    signed_client = sign_in(agent)

    response = signed_client.post(
        "/api/tickets/1/claim", headers={"Origin": "https://site-malicioso.test"}
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "ORIGIN_NOT_ALLOWED"


def test_health_reports_database_availability(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
