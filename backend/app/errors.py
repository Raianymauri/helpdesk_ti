"""Envelope de erro único da API.

Todo erro exposto usa `{"detail": {"code", "message", "fields"}}` para que o frontend
decida comportamento pelo código, nunca pela mensagem humana.
"""

from fastapi import status


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields or {}

    def to_payload(self) -> dict[str, object]:
        return {"detail": {"code": self.code, "message": self.message, "fields": self.fields}}


def invalid_credentials() -> ApiError:
    return ApiError(
        status.HTTP_401_UNAUTHORIZED,
        "INVALID_CREDENTIALS",
        "E-mail ou senha inválidos.",
    )


def authentication_required() -> ApiError:
    return ApiError(
        status.HTTP_401_UNAUTHORIZED,
        "AUTHENTICATION_REQUIRED",
        "Faça login para continuar.",
    )


def forbidden() -> ApiError:
    return ApiError(
        status.HTTP_403_FORBIDDEN,
        "FORBIDDEN",
        "Você não tem permissão para esta ação.",
    )


def origin_not_allowed() -> ApiError:
    return ApiError(
        status.HTTP_403_FORBIDDEN,
        "ORIGIN_NOT_ALLOWED",
        "Origem da requisição não permitida.",
    )


def ticket_not_found() -> ApiError:
    return ApiError(
        status.HTTP_404_NOT_FOUND,
        "TICKET_NOT_FOUND",
        "Chamado não encontrado.",
    )


def ticket_already_claimed() -> ApiError:
    return ApiError(
        status.HTTP_409_CONFLICT,
        "TICKET_ALREADY_CLAIMED",
        "Este chamado já foi assumido por outro agente.",
    )


def invalid_status_transition() -> ApiError:
    return ApiError(
        status.HTTP_409_CONFLICT,
        "INVALID_STATUS_TRANSITION",
        "Não é possível realizar esta transição.",
    )
