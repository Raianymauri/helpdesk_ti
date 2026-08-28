"""Rotas de autenticação."""

from fastapi import APIRouter, Depends, Request, Response, status

from app.auth.dependencies import CurrentUser, DatabaseSession, require_allowed_origin
from app.auth.schemas import AuthenticatedUserResponse, LoginRequest
from app.auth.service import SESSION_COOKIE_NAME, authenticate_user, end_session, start_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthenticatedUserResponse)
def login(payload: LoginRequest, request: Request, response: Response, db_session: DatabaseSession):
    settings = request.app.state.settings
    user = authenticate_user(db_session, payload.email, payload.password)
    token, max_age_seconds = start_session(db_session, user, settings.session_timeout_minutes)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.is_session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return user


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_allowed_origin)],
)
def logout(request: Request, db_session: DatabaseSession) -> Response:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        end_session(db_session, token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        SESSION_COOKIE_NAME,
        httponly=True,
        secure=request.app.state.settings.is_session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


@router.get("/me", response_model=AuthenticatedUserResponse)
def read_current_user(current_user: CurrentUser):
    return current_user
