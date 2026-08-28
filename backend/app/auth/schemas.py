"""Contratos de entrada e saída da autenticação."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# O produto não envia e-mail: basta garantir o formato e deixar a unicidade para o banco.
EmailAddress = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailAddress
    password: str = Field(min_length=1, max_length=200)


class RegisterRequest(BaseModel):
    """Cadastro público sempre cria conta REQUESTER; agentes seguem provisionados por comando."""

    model_config = ConfigDict(extra="forbid")

    display_name: DisplayName
    email: EmailAddress
    password: str = Field(min_length=8, max_length=200)


class AuthenticatedUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str = Field(validation_alias="email_normalized")
    role: str
