"""Autenticação por sessão first-party.

O banco guarda apenas o hash do token de sessão; o valor original vive somente no cookie.
"""

import hashlib
import secrets
from contextlib import suppress
from datetime import timedelta
from functools import cache

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from app.auth.models import Session, User
from app.database import utc_now
from app.errors import invalid_credentials

SESSION_COOKIE_NAME = "helpdesk_session"
SESSION_TOKEN_BYTES = 32

password_hasher = PasswordHasher()


@cache
def _unverifiable_password_hash() -> str:
    """Hash descartável usado para igualar o custo de login com e-mail inexistente."""
    return password_hasher.hash(secrets.token_urlsafe(SESSION_TOKEN_BYTES))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(plain_password: str) -> str:
    return password_hasher.hash(plain_password)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def authenticate_user(db_session: DbSession, email: str, plain_password: str) -> User:
    user = db_session.scalars(
        select(User).where(User.email_normalized == normalize_email(email))
    ).first()
    if user is None or not user.is_active:
        with suppress(VerificationError):
            password_hasher.verify(_unverifiable_password_hash(), plain_password)
        raise invalid_credentials()
    try:
        password_hasher.verify(user.password_hash, plain_password)
    except VerificationError as error:
        raise invalid_credentials() from error
    return user


def start_session(db_session: DbSession, user: User, timeout_minutes: int) -> tuple[str, int]:
    """Cria a sessão e devolve o token opaco com sua duração em segundos."""
    token = secrets.token_urlsafe(SESSION_TOKEN_BYTES)
    lifetime = timedelta(minutes=timeout_minutes)
    db_session.add(
        Session(
            token_hash=hash_session_token(token),
            user_id=user.id,
            expires_at=utc_now() + lifetime,
        )
    )
    db_session.commit()
    return token, int(lifetime.total_seconds())


def find_session_user(db_session: DbSession, token: str) -> User | None:
    session = db_session.scalars(
        select(Session).where(Session.token_hash == hash_session_token(token))
    ).first()
    if session is None or session.expires_at <= utc_now():
        return None
    return session.user if session.user.is_active else None


def end_session(db_session: DbSession, token: str) -> None:
    db_session.execute(delete(Session).where(Session.token_hash == hash_session_token(token)))
    db_session.commit()
