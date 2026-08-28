"""Fluxo de chamados: criação, visibilidade, busca, transições e comentários."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from app.auth.models import User, UserRole
from app.tickets import service

VALID_TICKET = {
    "title": "Computador não inicia",
    "description": "Ao pressionar o botão, nenhum LED acende.",
}


@pytest.fixture
def requester(create_user: Callable[..., User]) -> User:
    return create_user("maria@example.test", display_name="Maria Silva")


@pytest.fixture
def other_requester(create_user: Callable[..., User]) -> User:
    return create_user("joao@example.test", display_name="João Souza")


@pytest.fixture
def agent(create_user: Callable[..., User]) -> User:
    return create_user("ana@example.test", role=UserRole.AGENT, display_name="Ana Agente")


@pytest.fixture
def other_agent(create_user: Callable[..., User]) -> User:
    return create_user("bruno@example.test", role=UserRole.AGENT, display_name="Bruno Agente")


@pytest.fixture
def requester_client(sign_in: Callable[..., TestClient], requester: User) -> TestClient:
    return sign_in(requester)


@pytest.fixture
def agent_client(sign_in: Callable[..., TestClient], agent: User) -> TestClient:
    return sign_in(agent)


def create_ticket(client: TestClient, **overrides: object) -> dict:
    response = client.post("/api/tickets", json={**VALID_TICKET, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def test_new_ticket_starts_open_unassigned_with_default_priority(
    requester_client: TestClient,
) -> None:
    ticket = create_ticket(requester_client)

    assert ticket["number"] == f"#{ticket['id']}"
    assert ticket["status"] == "OPEN"
    assert ticket["priority"] == "MEDIUM"
    assert ticket["assignee"] is None
    assert ticket["requester"]["display_name"] == "Maria Silva"
    assert ticket["comments"] == []
    assert ticket["created_at"].endswith("Z")
    assert "email" not in ticket["requester"]


def test_requester_can_choose_priority_on_creation(requester_client: TestClient) -> None:
    assert create_ticket(requester_client, priority="HIGH")["priority"] == "HIGH"


@pytest.mark.parametrize(
    ("payload", "invalid_field"),
    [
        ({}, "title"),
        ({**VALID_TICKET, "title": "tela"}, "title"),
        ({**VALID_TICKET, "description": "curta"}, "description"),
        ({**VALID_TICKET, "title": "x" * 161}, "title"),
        ({**VALID_TICKET, "priority": "URGENT"}, "priority"),
        ({**VALID_TICKET, "category": "rede"}, "category"),
    ],
)
def test_invalid_ticket_payload_is_rejected_with_the_field(
    requester_client: TestClient, payload: dict, invalid_field: str
) -> None:
    response = requester_client.post("/api/tickets", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "VALIDATION_ERROR"
    assert invalid_field in detail["fields"]


def test_agent_cannot_open_tickets(agent_client: TestClient) -> None:
    response = agent_client.post("/api/tickets", json=VALID_TICKET)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_requester_sees_only_own_tickets(
    requester_client: TestClient, sign_in: Callable[..., TestClient], other_requester: User
) -> None:
    own_ticket = create_ticket(requester_client)
    other_client = sign_in(other_requester)
    create_ticket(other_client, title="Impressora sem tinta")

    listed = requester_client.get("/api/tickets").json()

    assert listed["total"] == 1
    assert [ticket["id"] for ticket in listed["items"]] == [own_ticket["id"]]


def test_requester_gets_not_found_for_someone_elses_ticket(
    requester_client: TestClient, sign_in: Callable[..., TestClient], other_requester: User
) -> None:
    other_ticket = create_ticket(sign_in(other_requester))

    response = requester_client.get(f"/api/tickets/{other_ticket['id']}")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "TICKET_NOT_FOUND"


def test_agent_sees_the_whole_queue(
    requester_client: TestClient,
    agent_client: TestClient,
    sign_in: Callable[..., TestClient],
    other_requester: User,
) -> None:
    create_ticket(requester_client)
    create_ticket(sign_in(other_requester), title="Impressora sem tinta")

    assert agent_client.get("/api/tickets").json()["total"] == 2


def test_list_orders_by_most_recent_update(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    first_ticket = create_ticket(requester_client, title="Teclado com defeito")
    second_ticket = create_ticket(requester_client, title="Monitor piscando")
    agent_client.post(f"/api/tickets/{first_ticket['id']}/claim")

    listed = agent_client.get("/api/tickets").json()["items"]

    assert [ticket["id"] for ticket in listed] == [first_ticket["id"], second_ticket["id"]]


def test_list_paginates_without_losing_total(requester_client: TestClient) -> None:
    for index in range(3):
        create_ticket(requester_client, title=f"Chamado número {index}")

    first_page = requester_client.get("/api/tickets", params={"page_size": 2}).json()
    second_page = requester_client.get("/api/tickets", params={"page_size": 2, "page": 2}).json()

    assert first_page["total"] == second_page["total"] == 3
    assert len(first_page["items"]) == 2
    assert len(second_page["items"]) == 1
    assert first_page["page_size"] == 2


@pytest.mark.parametrize("search_term", ["monitor", "MONITOR", "#2", "2"])
def test_search_matches_title_or_identifier(requester_client: TestClient, search_term: str) -> None:
    create_ticket(requester_client, title="Teclado com defeito")
    wanted_ticket = create_ticket(requester_client, title="Monitor piscando")

    found = requester_client.get("/api/tickets", params={"q": search_term}).json()

    assert [ticket["id"] for ticket in found["items"]] == [wanted_ticket["id"]]


def test_search_wildcard_is_not_interpreted(requester_client: TestClient) -> None:
    create_ticket(requester_client, title="Teclado com defeito")

    assert requester_client.get("/api/tickets", params={"q": "%"}).json()["total"] == 0


def test_status_filter_narrows_the_queue(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    claimed_ticket = create_ticket(requester_client, title="Teclado com defeito")
    create_ticket(requester_client, title="Monitor piscando")
    agent_client.post(f"/api/tickets/{claimed_ticket['id']}/claim")

    filtered = agent_client.get("/api/tickets", params={"status": "IN_PROGRESS"}).json()

    assert [ticket["id"] for ticket in filtered["items"]] == [claimed_ticket["id"]]


def test_unknown_list_parameter_is_rejected(requester_client: TestClient) -> None:
    response = requester_client.get("/api/tickets", params={"assignee": "1"})

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "VALIDATION_ERROR"


def test_page_size_above_the_limit_is_rejected(requester_client: TestClient) -> None:
    response = requester_client.get("/api/tickets", params={"page_size": 101})

    assert response.status_code == 422
    assert "page_size" in response.json()["detail"]["fields"]


def test_agent_claims_an_open_ticket(
    requester_client: TestClient, agent_client: TestClient, agent: User
) -> None:
    ticket = create_ticket(requester_client)

    claimed = agent_client.post(f"/api/tickets/{ticket['id']}/claim").json()

    assert claimed["status"] == "IN_PROGRESS"
    assert claimed["assignee"]["id"] == agent.id


def test_second_agent_loses_the_claim(
    requester_client: TestClient,
    agent_client: TestClient,
    sign_in: Callable[..., TestClient],
    other_agent: User,
) -> None:
    ticket = create_ticket(requester_client)
    agent_client.post(f"/api/tickets/{ticket['id']}/claim")

    response = sign_in(other_agent).post(f"/api/tickets/{ticket['id']}/claim")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TICKET_ALREADY_CLAIMED"


def test_claim_lost_between_check_and_write_returns_conflict(
    requester_client: TestClient,
    agent_client: TestClient,
    sign_in: Callable[..., TestClient],
    other_agent: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Simula leitura obsoleta: a escrita condicional é a barreira real da concorrência."""
    ticket = create_ticket(requester_client)
    sign_in(other_agent).post(f"/api/tickets/{ticket['id']}/claim")
    monkeypatch.setattr(service, "can_claim_ticket", lambda actor, ticket_state: True)

    response = agent_client.post(f"/api/tickets/{ticket['id']}/claim")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TICKET_ALREADY_CLAIMED"


def test_requester_cannot_claim(requester_client: TestClient) -> None:
    ticket = create_ticket(requester_client)

    response = requester_client.post(f"/api/tickets/{ticket['id']}/claim")

    assert response.status_code == 403


def test_only_the_assignee_releases_the_ticket(
    requester_client: TestClient,
    agent_client: TestClient,
    sign_in: Callable[..., TestClient],
    other_agent: User,
) -> None:
    ticket = create_ticket(requester_client)
    agent_client.post(f"/api/tickets/{ticket['id']}/claim")

    assert sign_in(other_agent).delete(f"/api/tickets/{ticket['id']}/claim").status_code == 403

    released = agent_client.delete(f"/api/tickets/{ticket['id']}/claim").json()
    assert released["status"] == "OPEN"
    assert released["assignee"] is None


def test_assignee_resolves_and_reopens(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)
    agent_client.post(f"/api/tickets/{ticket['id']}/claim")

    resolved = agent_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "RESOLVED"})
    assert resolved.json()["status"] == "RESOLVED"

    reopened = agent_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "IN_PROGRESS"})
    assert reopened.json()["status"] == "IN_PROGRESS"


def test_owner_requester_reopens_a_resolved_ticket(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)
    agent_client.post(f"/api/tickets/{ticket['id']}/claim")
    agent_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "RESOLVED"})

    reopened = requester_client.patch(
        f"/api/tickets/{ticket['id']}", json={"status": "IN_PROGRESS"}
    )

    assert reopened.status_code == 200
    assert reopened.json()["status"] == "IN_PROGRESS"


def test_requester_cannot_resolve(requester_client: TestClient, agent_client: TestClient) -> None:
    ticket = create_ticket(requester_client)
    agent_client.post(f"/api/tickets/{ticket['id']}/claim")

    response = requester_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "RESOLVED"})

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "FORBIDDEN"


def test_unlisted_transition_is_refused(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)

    response = agent_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "RESOLVED"})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INVALID_STATUS_TRANSITION"
    assert agent_client.get(f"/api/tickets/{ticket['id']}").json()["status"] == "OPEN"


def test_repeating_the_current_status_succeeds_without_change(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)

    response = agent_client.patch(f"/api/tickets/{ticket['id']}", json={"status": "OPEN"})

    assert response.status_code == 200
    assert response.json()["updated_at"] == ticket["updated_at"]


def test_agent_changes_priority_and_requester_cannot(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)

    assert (
        agent_client.patch(f"/api/tickets/{ticket['id']}", json={"priority": "HIGH"}).json()[
            "priority"
        ]
        == "HIGH"
    )
    assert (
        requester_client.patch(f"/api/tickets/{ticket['id']}", json={"priority": "LOW"}).status_code
        == 403
    )


def test_invalid_status_does_not_apply_the_valid_priority(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)

    response = agent_client.patch(
        f"/api/tickets/{ticket['id']}", json={"priority": "HIGH", "status": "RESOLVED"}
    )

    assert response.status_code == 409
    assert agent_client.get(f"/api/tickets/{ticket['id']}").json()["priority"] == "MEDIUM"


def test_empty_patch_is_rejected(requester_client: TestClient) -> None:
    ticket = create_ticket(requester_client)

    response = requester_client.patch(f"/api/tickets/{ticket['id']}", json={})

    assert response.status_code == 422


def test_comment_is_stored_in_order_and_refreshes_the_ticket(
    requester_client: TestClient, agent_client: TestClient
) -> None:
    ticket = create_ticket(requester_client)

    requester_client.post(f"/api/tickets/{ticket['id']}/comments", json={"body": "Primeiro"})
    detail = agent_client.post(
        f"/api/tickets/{ticket['id']}/comments", json={"body": "Segundo"}
    ).json()

    assert [comment["body"] for comment in detail["comments"]] == ["Primeiro", "Segundo"]
    assert detail["comments"][1]["author"]["display_name"] == "Ana Agente"
    assert detail["updated_at"] > ticket["updated_at"]


def test_comment_is_kept_as_plain_text(requester_client: TestClient) -> None:
    ticket = create_ticket(requester_client)
    script_body = "<script>alert('x')</script>"

    detail = requester_client.post(
        f"/api/tickets/{ticket['id']}/comments", json={"body": script_body}
    ).json()

    assert detail["comments"][0]["body"] == script_body


def test_invalid_comment_does_not_persist(
    requester_client: TestClient, db_session: DbSession
) -> None:
    ticket = create_ticket(requester_client)

    response = requester_client.post(f"/api/tickets/{ticket['id']}/comments", json={"body": "   "})

    assert response.status_code == 422
    assert db_session.execute(text("SELECT count(*) FROM comments")).scalar_one() == 0


def test_requester_cannot_comment_on_someone_elses_ticket(
    requester_client: TestClient, sign_in: Callable[..., TestClient], other_requester: User
) -> None:
    other_ticket = create_ticket(sign_in(other_requester))

    response = requester_client.post(
        f"/api/tickets/{other_ticket['id']}/comments", json={"body": "Oi"}
    )

    assert response.status_code == 404


def test_missing_ticket_answers_not_found(agent_client: TestClient) -> None:
    assert agent_client.get("/api/tickets/999").status_code == 404


def test_tickets_require_authentication(client: TestClient) -> None:
    assert client.get("/api/tickets").status_code == 401
