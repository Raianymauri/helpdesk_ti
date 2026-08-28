"""Configuração da aplicação, lida do ambiente e validada na inicialização."""

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE_PATH = BACKEND_ROOT / "data" / "helpdesk.db"
VALID_ENVIRONMENTS = ("development", "test", "production")


class ConfigurationError(RuntimeError):
    """Configuração ausente ou inválida impede a aplicação de subir."""


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_path: Path
    session_timeout_minutes: int
    is_session_cookie_secure: bool
    allowed_origin: str

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


def _read_positive_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value == "":
        return default
    if not raw_value.isdigit() or int(raw_value) <= 0:
        raise ConfigurationError(f"{name} deve ser um inteiro positivo.")
    return int(raw_value)


def _read_boolean(name: str, default: bool) -> bool:
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value == "":
        return default
    normalized_value = raw_value.strip().lower()
    if normalized_value not in {"true", "false"}:
        raise ConfigurationError(f"{name} deve ser 'true' ou 'false'.")
    return normalized_value == "true"


def load_settings() -> Settings:
    app_env = os.environ.get("APP_ENV", "development").strip().lower()
    if app_env not in VALID_ENVIRONMENTS:
        raise ConfigurationError(f"APP_ENV deve ser um de {', '.join(VALID_ENVIRONMENTS)}.")

    raw_database_path = os.environ.get("SQLITE_DATABASE_PATH", "").strip()
    database_path = Path(raw_database_path) if raw_database_path else DEFAULT_DATABASE_PATH

    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173").strip()
    if not allowed_origin:
        raise ConfigurationError("ALLOWED_ORIGIN não pode ser vazio.")

    is_production = app_env == "production"
    settings = Settings(
        app_env=app_env,
        database_path=database_path,
        session_timeout_minutes=_read_positive_int("SESSION_TIMEOUT_MINUTES", 480),
        is_session_cookie_secure=_read_boolean("SESSION_COOKIE_SECURE", is_production),
        allowed_origin=allowed_origin,
    )
    if is_production and not settings.is_session_cookie_secure:
        raise ConfigurationError("SESSION_COOKIE_SECURE deve ser 'true' em produção.")
    return settings
