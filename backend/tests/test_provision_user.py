"""Comando administrativo de provisionamento de contas."""

from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from app.provision_user import main


@pytest.fixture(autouse=True)
def configured_environment(monkeypatch: pytest.MonkeyPatch, database_path: Path) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SQLITE_DATABASE_PATH", str(database_path))


def _command_arguments(display_name: str, role: str) -> list[str]:
    return [
        "--name",
        display_name,
        "--email",
        " Ana@Example.test ",
        "--role",
        role,
        "--password",
        "senha-de-teste",
    ]


def test_command_creates_then_updates_the_same_account(db_session: DbSession) -> None:
    assert main(_command_arguments("Ana Agente", "AGENT")) == 0
    assert main(_command_arguments("Ana Atualizada", "REQUESTER")) == 0

    rows = db_session.execute(text("SELECT display_name, email_normalized, role FROM users")).all()
    assert rows == [("Ana Atualizada", "ana@example.test", "REQUESTER")]


@pytest.mark.parametrize(
    "invalid_argument", [("--name", "A"), ("--password", "curta")], ids=["name", "password"]
)
def test_command_refuses_invalid_input(invalid_argument: tuple[str, str]) -> None:
    arguments = {
        "--name": "Ana Agente",
        "--email": "ana@example.test",
        "--role": "AGENT",
        "--password": "senha-de-teste",
    }
    arguments[invalid_argument[0]] = invalid_argument[1]

    flat_arguments = [part for pair in arguments.items() for part in pair]
    assert main(flat_arguments) == 2
