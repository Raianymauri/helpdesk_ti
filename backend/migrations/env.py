"""Ambiente do Alembic: usa a mesma configuração de SQLite da aplicação."""

from pathlib import Path

from alembic import context

from app.auth import models as auth_models  # noqa: F401  (registra as tabelas no metadata)
from app.config import load_settings
from app.database import Base, create_database_engine
from app.tickets import models as ticket_models  # noqa: F401

target_metadata = Base.metadata


def _database_url() -> str:
    configured_url = context.config.get_main_option("sqlalchemy.url")
    if configured_url:
        return configured_url
    return f"sqlite+pysqlite:///{load_settings().database_path}"


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_database_engine(Path(_database_url().removeprefix("sqlite+pysqlite:///")))
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, render_as_batch=True
        )
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
