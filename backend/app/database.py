"""Engine, sessão e PRAGMAs do SQLite."""

from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

from fastapi import Request
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def utc_now() -> datetime:
    """Instante atual em UTC, sem tzinfo, como o SQLite armazena."""
    return datetime.now(UTC).replace(tzinfo=None)


def create_database_engine(database_path: Path) -> Engine:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite+pysqlite:///{database_path}", future=True)

    @event.listens_for(engine, "connect")
    def _apply_sqlite_pragmas(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA busy_timeout = 5000")
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.close()

    return engine


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)


def assert_schema_is_migrated(engine: Engine) -> None:
    """Falha claramente quando o banco existe mas não passou pela migração."""
    with engine.connect() as connection:
        migrated_tables = connection.execute(
            text("SELECT name FROM sqlite_master WHERE type = 'table'")
        ).scalars()
        table_names = set(migrated_tables)
    missing_tables = {"alembic_version", "users", "sessions", "tickets", "comments"} - table_names
    if missing_tables:
        raise RuntimeError(
            "Banco de dados não migrado. Execute 'alembic upgrade head' antes de iniciar a API."
        )


def get_db_session(request: Request) -> Iterator[Session]:
    session_factory: sessionmaker[Session] = request.app.state.session_factory
    session = session_factory()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
