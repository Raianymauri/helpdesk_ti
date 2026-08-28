"""Contratos de entrada e saída dos chamados."""

from datetime import UTC, datetime
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
    computed_field,
    model_validator,
)

from app.tickets.rules import TicketPriority, TicketStatus


def _to_rfc3339_utc(moment: datetime) -> str:
    return moment.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")


UtcDateTime = Annotated[datetime, PlainSerializer(_to_rfc3339_utc, return_type=str)]
TicketTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=160)]
TicketDescription = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=10, max_length=5000)
]
CommentBody = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class TicketCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: TicketTitle
    description: TicketDescription
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TicketStatus | None = None
    priority: TicketPriority | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> Self:
        if self.status is None and self.priority is None:
            raise ValueError("Informe status e/ou prioridade.")
        return self


class CommentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: CommentBody


class TicketListQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    q: Annotated[str, StringConstraints(min_length=1, max_length=100)] | None = None
    status: TicketStatus | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class UserSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: str


class TicketSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    status: TicketStatus
    priority: TicketPriority
    requester: UserSummaryResponse
    assignee: UserSummaryResponse | None
    created_at: UtcDateTime
    updated_at: UtcDateTime

    @computed_field
    @property
    def number(self) -> str:
        return f"#{self.id}"


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: UserSummaryResponse
    body: str
    created_at: UtcDateTime


class TicketDetailResponse(TicketSummaryResponse):
    description: str
    comments: list[CommentResponse]


class TicketPageResponse(BaseModel):
    items: list[TicketSummaryResponse]
    page: int
    page_size: int
    total: int
