"""Dependências HTTP de autenticação e proteção contra requisição de outra origem."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session as DbSession

from app.auth.models import User
from app.auth.service import SESSION_COOKIE_NAME, find_session_user
from app.database import get_db_session
from app.errors import authentication_required, origin_not_allowed

MUTATION_METHODS = frozenset({"POST", "PATCH", "DELETE"})


def require_allowed_origin(request: Request) -> None:
    """Rejeita mutação vinda de outra origem; o cookie de sessão sozinho não basta."""
    if request.method not in MUTATION_METHODS:
        return
    if request.headers.get("origin") != request.app.state.settings.allowed_origin:
        raise origin_not_allowed()


def get_current_user(
    request: Request, db_session: Annotated[DbSession, Depends(get_db_session)]
) -> User:
    # Toda rota autenticada passa por aqui, então a origem das mutações é verificada
    # em um único lugar em vez de rota a rota.
    require_allowed_origin(request)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise authentication_required()
    user = find_session_user(db_session, token)
    if user is None:
        raise authentication_required()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[DbSession, Depends(get_db_session)]
