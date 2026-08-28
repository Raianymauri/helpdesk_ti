"""Leitura e validação das variáveis de ambiente."""

import pytest

from app.config import DEFAULT_DATABASE_PATH, ConfigurationError, load_settings


def test_defaults_are_applied_for_development(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "APP_ENV",
        "SQLITE_DATABASE_PATH",
        "SESSION_TIMEOUT_MINUTES",
        "SESSION_COOKIE_SECURE",
        "ALLOWED_ORIGIN",
    ):
        monkeypatch.delenv(name, raising=False)

    settings = load_settings()

    assert settings.app_env == "development"
    assert settings.database_path == DEFAULT_DATABASE_PATH
    assert settings.session_timeout_minutes == 480
    assert settings.is_session_cookie_secure is False
    assert settings.is_production is False


def test_production_requires_a_secure_cookie(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SESSION_COOKIE_SECURE", "false")

    with pytest.raises(ConfigurationError, match="SESSION_COOKIE_SECURE"):
        load_settings()


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("APP_ENV", "staging"),
        ("SESSION_TIMEOUT_MINUTES", "zero"),
        ("SESSION_COOKIE_SECURE", "talvez"),
        ("ALLOWED_ORIGIN", " "),
    ],
)
def test_invalid_configuration_stops_the_application(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str
) -> None:
    monkeypatch.setenv(name, value)

    with pytest.raises(ConfigurationError):
        load_settings()
