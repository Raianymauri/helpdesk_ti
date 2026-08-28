"""Migração, PRAGMAs e integridade referencial do SQLite."""

from pathlib import Path

import pytest
from alembic import command
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.config import BACKEND_ROOT, Settings
from app.database import assert_schema_is_migrated, create_database_engine
from app.main import create_app
from tests.conftest import migrate_database


def _alembic_config(database_path: Path):
    from alembic.config import Config

    config = Config(BACKEND_ROOT / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite+pysqlite:///{database_path}")
    return config


def test_migration_upgrades_downgrades_and_upgrades_again(tmp_path: Path) -> None:
    database_path = tmp_path / "migration-check.db"
    config = _alembic_config(database_path)

    command.upgrade(config, "head")
    engine = create_database_engine(database_path)
    with engine.connect() as connection:
        tables = set(connection.execute(text("SELECT name FROM sqlite_master")).scalars())
    assert {"users", "sessions", "tickets", "comments"} <= tables

    command.downgrade(config, "base")
    with engine.connect() as connection:
        tables = set(connection.execute(text("SELECT name FROM sqlite_master")).scalars())
    assert not {"users", "sessions", "tickets", "comments"} & tables

    command.upgrade(config, "head")
    assert_schema_is_migrated(engine)
    engine.dispose()


def test_every_connection_enables_foreign_keys_and_busy_timeout(db_session: DbSession) -> None:
    assert db_session.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
    assert db_session.execute(text("PRAGMA busy_timeout")).scalar_one() == 5000
    assert db_session.execute(text("PRAGMA journal_mode")).scalar_one() == "wal"


def test_foreign_keys_reject_an_orphan_comment(db_session: DbSession) -> None:
    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO comments (ticket_id, author_id, body, created_at)"
                " VALUES (999, 999, 'orfao', '2026-01-01 00:00:00')"
            )
        )
        db_session.commit()


def test_unmigrated_database_fails_with_a_clear_message(tmp_path: Path) -> None:
    engine = create_database_engine(tmp_path / "vazio.db")

    with pytest.raises(RuntimeError, match="alembic upgrade head"):
        assert_schema_is_migrated(engine)
    engine.dispose()


def test_openapi_is_disabled_in_production(tmp_path: Path) -> None:
    database_path = tmp_path / "producao.db"
    migrate_database(database_path)
    production_settings = Settings(
        app_env="production",
        database_path=database_path,
        session_timeout_minutes=480,
        is_session_cookie_secure=True,
        allowed_origin="https://helpdesk.example.test",
    )

    assert create_app(production_settings).openapi_url is None
