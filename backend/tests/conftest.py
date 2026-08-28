"""Fixtures compartilhadas: cada teste roda contra um SQLite temporário e migrado."""

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DbSession

from app.auth.models import User, UserRole
from app.auth.service import hash_password
from app.config import BACKEND_ROOT, Settings
from app.database import create_database_engine, create_session_factory
from app.main import create_app

TEST_ORIGIN = "http://testserver"
TEST_PASSWORD = "senha-de-teste"


def migrate_database(database_path: Path) -> None:
    alembic_config = Config(BACKEND_ROOT / "alembic.ini")
    alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    alembic_config.set_main_option("sqlalchemy.url", f"sqlite+pysqlite:///{database_path}")
    command.upgrade(alembic_config, "head")


@pytest.fixture
def database_path(tmp_path: Path) -> Path:
    path = tmp_path / "helpdesk-test.db"
    migrate_database(path)
    return path


@pytest.fixture
def settings(database_path: Path) -> Settings:
    return Settings(
        app_env="test",
        database_path=database_path,
        session_timeout_minutes=480,
        is_session_cookie_secure=False,
        allowed_origin=TEST_ORIGIN,
    )


@pytest.fixture
def db_session(database_path: Path) -> Iterator[DbSession]:
    engine = create_database_engine(database_path)
    with create_session_factory(engine)() as session:
        yield session
    engine.dispose()


@pytest.fixture
def app(settings: Settings) -> Iterator[FastAPI]:
    application = create_app(settings)
    with TestClient(application):  # executa o lifespan uma única vez por teste
        yield application


@pytest.fixture
def client_factory(app: FastAPI) -> Callable[[], TestClient]:
    """Cada cliente tem seu próprio cookie jar, permitindo dois atores no mesmo teste."""

    def _client_factory() -> TestClient:
        return TestClient(app, base_url=TEST_ORIGIN, headers={"Origin": TEST_ORIGIN})

    return _client_factory


@pytest.fixture
def client(client_factory: Callable[[], TestClient]) -> TestClient:
    return client_factory()


@pytest.fixture
def create_user(db_session: DbSession) -> Callable[..., User]:
    def _create_user(
        email: str,
        role: UserRole = UserRole.REQUESTER,
        display_name: str = "Pessoa de Teste",
        is_active: bool = True,
        password: str = TEST_PASSWORD,
    ) -> User:
        user = User(
            display_name=display_name,
            email_normalized=email,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture
def sign_in(client_factory: Callable[[], TestClient]) -> Callable[..., TestClient]:
    def _sign_in(user: User, password: str = TEST_PASSWORD) -> TestClient:
        signed_client = client_factory()
        response = signed_client.post(
            "/api/auth/login", json={"email": user.email_normalized, "password": password}
        )
        assert response.status_code == 200, response.text
        return signed_client

    return _sign_in
