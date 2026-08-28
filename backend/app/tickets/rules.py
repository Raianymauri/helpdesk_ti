"""Regras puras de estado e autorização de chamados.

Sem FastAPI e sem SQLAlchemy: cada função depende apenas dos valores recebidos,
o que permite cobrir toda a matriz de papel, estado e transição por teste direto.
"""

from dataclasses import dataclass
from enum import StrEnum


class TicketStatus(StrEnum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class TicketPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


DEFAULT_TICKET_PRIORITY = TicketPriority.MEDIUM


class StatusChangeDecision(StrEnum):
    ALLOWED = "ALLOWED"
    UNCHANGED = "UNCHANGED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_TRANSITION = "INVALID_TRANSITION"


@dataclass(frozen=True)
class Actor:
    id: int
    is_agent: bool


@dataclass(frozen=True)
class TicketState:
    status: TicketStatus
    requester_id: int
    assignee_id: int | None


def can_view_ticket(actor: Actor, ticket: TicketState) -> bool:
    return actor.is_agent or actor.id == ticket.requester_id


def can_claim_ticket(actor: Actor, ticket: TicketState) -> bool:
    return actor.is_agent and ticket.status is TicketStatus.OPEN and ticket.assignee_id is None


def can_release_ticket(actor: Actor, ticket: TicketState) -> bool:
    return (
        actor.is_agent
        and ticket.status is TicketStatus.IN_PROGRESS
        and ticket.assignee_id == actor.id
    )


def can_change_priority(actor: Actor) -> bool:
    return actor.is_agent


def can_comment_on_ticket(actor: Actor, ticket: TicketState) -> bool:
    return can_view_ticket(actor, ticket)


def decide_status_change(
    actor: Actor, ticket: TicketState, requested_status: TicketStatus
) -> StatusChangeDecision:
    if requested_status is ticket.status:
        return StatusChangeDecision.UNCHANGED

    transition = (ticket.status, requested_status)
    if transition == (TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED):
        is_assignee = ticket.assignee_id is not None and ticket.assignee_id == actor.id
        return StatusChangeDecision.ALLOWED if is_assignee else StatusChangeDecision.FORBIDDEN
    if transition == (TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS):
        can_reopen = actor.id in {ticket.assignee_id, ticket.requester_id}
        return StatusChangeDecision.ALLOWED if can_reopen else StatusChangeDecision.FORBIDDEN
    return StatusChangeDecision.INVALID_TRANSITION
