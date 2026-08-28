"""Aplicação FastAPI: montagem, ciclo de vida e tradução de exceções em respostas."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.auth.router import router as auth_router
from app.config import Settings, load_settings
from app.database import (
    assert_schema_is_migrated,
    create_database_engine,
    create_session_factory,
)
from app.errors import ApiError
from app.tickets.router import router as tickets_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    engine = create_database_engine(settings.database_path)
    assert_schema_is_migrated(engine)
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    try:
        yield
    finally:
        engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    app = FastAPI(
        title="Helpdesk TI",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url=None if resolved_settings.is_production else "/openapi.json",
        docs_url=None if resolved_settings.is_production else "/docs",
        redoc_url=None,
    )
    app.state.settings = resolved_settings
    app.include_router(auth_router, prefix="/api")
    app.include_router(tickets_router, prefix="/api")

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content=error.to_payload())

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        fields = {
            ".".join(str(part) for part in problem["loc"][1:]) or "body": problem["msg"]
            for problem in error.errors()
        }
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "detail": {
                    "code": "VALIDATION_ERROR",
                    "message": "Verifique os campos informados.",
                    "fields": fields,
                }
            },
        )

    @app.exception_handler(OperationalError)
    async def handle_database_busy(request: Request, error: OperationalError) -> JSONResponse:
        # O SQLite aceita um escritor por vez; após o busy_timeout a espera vira erro claro.
        if "locked" not in str(error.orig).lower() and "busy" not in str(error.orig).lower():
            return await handle_unexpected_error(request, error)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            headers={"Retry-After": "1"},
            content={
                "detail": {
                    "code": "DATABASE_BUSY",
                    "message": "Serviço ocupado. Tente novamente.",
                    "fields": {},
                }
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": {
                    "code": "INTERNAL_ERROR",
                    "message": "Erro inesperado. Tente novamente.",
                    "fields": {},
                }
            },
        )

    @app.get("/health", tags=["health"])
    def read_health(request: Request) -> dict[str, str]:
        with request.app.state.engine.connect():
            return {"status": "ok"}

    return app


app = create_app()
