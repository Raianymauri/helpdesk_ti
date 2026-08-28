"""Casos de uso de chamados: autorização, transação e persistência."""

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session as DbSession

from app.auth.models import User
from app.database import utc_now
from app.errors import (
    forbidden,
    invalid_status_transition,
    ticket_already_claimed,
    ticket_not_found,
)
from app.tickets.models import Comment, Ticket
from app.tickets.rules import (
    Actor,
    StatusChangeDecision,
    TicketState,
    TicketStatus,
    can_change_priority,
    can_claim_ticket,
    can_comment_on_ticket,
    can_release_ticket,
    can_view_ticket,
    decide_status_change,
)
from app.tickets.schemas import TicketCreateRequest, TicketListQuery, TicketUpdateRequest

LIKE_ESCAPE_CHARACTER = "\\"


def _to_actor(user: User) -> Actor:
    return Actor(id=user.id, is_agent=user.is_agent)


def _to_state(ticket: Ticket) -> TicketState:
    return TicketState(
        status=TicketStatus(ticket.status),
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
    )


def _escape_like_term(term: str) -> str:
    for character in (LIKE_ESCAPE_CHARACTER, "%", "_"):
        term = term.replace(character, LIKE_ESCAPE_CHARACTER + character)
    return term


def create_ticket(db_session: DbSession, requester: User, payload: TicketCreateRequest) -> Ticket:
    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status=TicketStatus.OPEN,
        requester_id=requester.id,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


def list_tickets(
    db_session: DbSession, current_user: User, query: TicketListQuery
) -> tuple[list[Ticket], int]:
    conditions = []
    if not current_user.is_agent:
        conditions.append(Ticket.requester_id == current_user.id)
    if query.status is not None:
        conditions.append(Ticket.status == query.status)
    if query.q is not None:
        search_term = query.q.strip()
        title_match = Ticket.title.ilike(
            f"%{_escape_like_term(search_term)}%", escape=LIKE_ESCAPE_CHARACTER
        )
        possible_id = search_term.removeprefix("#")
        if possible_id.isdigit():
            conditions.append(or_(Ticket.id == int(possible_id), title_match))
        else:
            conditions.append(title_match)

    total = db_session.scalar(select(func.count()).select_from(Ticket).where(*conditions)) or 0
    tickets = db_session.scalars(
        select(Ticket)
        .where(*conditions)
        .order_by(Ticket.updated_at.desc(), Ticket.id.desc())
        .offset((query.page - 1) * query.page_size)
        .limit(query.page_size)
    ).unique()
    return list(tickets), total


def get_visible_ticket(db_session: DbSession, current_user: User, ticket_id: int) -> Ticket:
    """Chamado invisível para o usuário responde como inexistente, sem revelar sua existência."""
    ticket = db_session.get(Ticket, ticket_id)
    if ticket is None or not can_view_ticket(_to_actor(current_user), _to_state(ticket)):
        raise ticket_not_found()
    return ticket


def claim_ticket(db_session: DbSession, current_user: User, ticket_id: int) -> Ticket:
    ticket = get_visible_ticket(db_session, current_user, ticket_id)
    actor = _to_actor(current_user)
    if not actor.is_agent:
        raise forbidden()
    if not can_claim_ticket(actor, _to_state(ticket)):
        raise ticket_already_claimed()

    # Alteração condicional: apenas um agente concorrente encontra o chamado ainda aberto.
    claimed_rows = db_session.execute(
        update(Ticket)
        .where(
            Ticket.id == ticket_id,
            Ticket.status == TicketStatus.OPEN,
            Ticket.assignee_id.is_(None),
        )
        .values(assignee_id=actor.id, status=TicketStatus.IN_PROGRESS, updated_at=utc_now())
    ).rowcount
    if claimed_rows == 0:
        db_session.rollback()
        raise ticket_already_claimed()
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


def release_ticket(db_session: DbSession, current_user: User, ticket_id: int) -> Ticket:
    ticket = get_visible_ticket(db_session, current_user, ticket_id)
    actor = _to_actor(current_user)
    if not can_release_ticket(actor, _to_state(ticket)):
        raise forbidden()

    released_rows = db_session.execute(
        update(Ticket)
        .where(
            Ticket.id == ticket_id,
            Ticket.status == TicketStatus.IN_PROGRESS,
            Ticket.assignee_id == actor.id,
        )
        .values(assignee_id=None, status=TicketStatus.OPEN, updated_at=utc_now())
    ).rowcount
    if released_rows == 0:
        db_session.rollback()
        raise invalid_status_transition()
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


def update_ticket(
    db_session: DbSession, current_user: User, ticket_id: int, payload: TicketUpdateRequest
) -> Ticket:
    """Decide status e prioridade antes de escrever.

    Um campo inválido rejeita a requisição inteira, sem aplicar o outro.
    """
    ticket = get_visible_ticket(db_session, current_user, ticket_id)
    actor = _to_actor(current_user)

    if payload.priority is not None and not can_change_priority(actor):
        raise forbidden()

    new_values: dict[str, object] = {}
    if payload.priority is not None and payload.priority != ticket.priority:
        new_values["priority"] = payload.priority
    if payload.status is not None:
        decision = decide_status_change(actor, _to_state(ticket), payload.status)
        if decision is StatusChangeDecision.FORBIDDEN:
            raise forbidden()
        if decision is StatusChangeDecision.INVALID_TRANSITION:
            raise invalid_status_transition()
        if decision is StatusChangeDecision.ALLOWED:
            new_values["status"] = payload.status

    if new_values:
        for attribute_name, value in new_values.items():
            setattr(ticket, attribute_name, value)
        ticket.updated_at = utc_now()
        db_session.commit()
        db_session.refresh(ticket)
    return ticket


def add_comment(
    db_session: DbSession, current_user: User, ticket_id: int, body: str
) -> tuple[Ticket, Comment]:
    ticket = get_visible_ticket(db_session, current_user, ticket_id)
    if not can_comment_on_ticket(_to_actor(current_user), _to_state(ticket)):
        raise forbidden()

    comment = Comment(ticket_id=ticket.id, author_id=current_user.id, body=body)
    db_session.add(comment)
    ticket.updated_at = utc_now()
    db_session.commit()
    db_session.refresh(comment)
    db_session.refresh(ticket)
    return ticket, comment
