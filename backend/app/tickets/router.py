"""Rotas de chamados."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.auth.dependencies import CurrentUser, DatabaseSession
from app.errors import forbidden
from app.tickets import service
from app.tickets.schemas import (
    CommentCreateRequest,
    TicketCreateRequest,
    TicketDetailResponse,
    TicketListQuery,
    TicketPageResponse,
    TicketUpdateRequest,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])

TicketId = Annotated[int, Path(ge=1)]


@router.get("", response_model=TicketPageResponse)
def list_tickets(
    current_user: CurrentUser,
    db_session: DatabaseSession,
    query: Annotated[TicketListQuery, Query()],
):
    tickets, total = service.list_tickets(db_session, current_user, query)
    return TicketPageResponse(
        items=tickets, page=query.page, page_size=query.page_size, total=total
    )


@router.post("", response_model=TicketDetailResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreateRequest, current_user: CurrentUser, db_session: DatabaseSession
):
    if current_user.is_agent:
        raise forbidden()
    return service.create_ticket(db_session, current_user, payload)


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def read_ticket(ticket_id: TicketId, current_user: CurrentUser, db_session: DatabaseSession):
    return service.get_visible_ticket(db_session, current_user, ticket_id)


@router.post("/{ticket_id}/claim", response_model=TicketDetailResponse)
def claim_ticket(ticket_id: TicketId, current_user: CurrentUser, db_session: DatabaseSession):
    return service.claim_ticket(db_session, current_user, ticket_id)


@router.delete("/{ticket_id}/claim", response_model=TicketDetailResponse)
def release_ticket(ticket_id: TicketId, current_user: CurrentUser, db_session: DatabaseSession):
    return service.release_ticket(db_session, current_user, ticket_id)


@router.patch("/{ticket_id}", response_model=TicketDetailResponse)
def update_ticket(
    ticket_id: TicketId,
    payload: TicketUpdateRequest,
    current_user: CurrentUser,
    db_session: DatabaseSession,
):
    return service.update_ticket(db_session, current_user, ticket_id, payload)


@router.post(
    "/{ticket_id}/comments",
    response_model=TicketDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    ticket_id: TicketId,
    payload: CommentCreateRequest,
    current_user: CurrentUser,
    db_session: DatabaseSession,
):
    ticket, _ = service.add_comment(db_session, current_user, ticket_id, payload.body)
    return ticket
