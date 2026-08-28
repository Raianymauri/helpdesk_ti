"""Matriz de papel, estado e transição sobre as funções puras de regra."""

import pytest

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

REQUESTER = Actor(id=1, is_agent=False)
OTHER_REQUESTER = Actor(id=2, is_agent=False)
AGENT = Actor(id=3, is_agent=True)
OTHER_AGENT = Actor(id=4, is_agent=True)

OPEN_TICKET = TicketState(status=TicketStatus.OPEN, requester_id=1, assignee_id=None)
CLAIMED_TICKET = TicketState(status=TicketStatus.IN_PROGRESS, requester_id=1, assignee_id=3)
RESOLVED_TICKET = TicketState(status=TicketStatus.RESOLVED, requester_id=1, assignee_id=3)


@pytest.mark.parametrize(
    ("actor", "ticket", "expected"),
    [
        (REQUESTER, OPEN_TICKET, True),
        (OTHER_REQUESTER, OPEN_TICKET, False),
        (AGENT, OPEN_TICKET, True),
        (OTHER_AGENT, RESOLVED_TICKET, True),
    ],
)
def test_view_permission(actor: Actor, ticket: TicketState, expected: bool) -> None:
    assert can_view_ticket(actor, ticket) is expected
    assert can_comment_on_ticket(actor, ticket) is expected


@pytest.mark.parametrize(
    ("actor", "ticket", "expected"),
    [
        (AGENT, OPEN_TICKET, True),
        (REQUESTER, OPEN_TICKET, False),
        (OTHER_AGENT, CLAIMED_TICKET, False),
        (AGENT, RESOLVED_TICKET, False),
    ],
)
def test_claim_permission(actor: Actor, ticket: TicketState, expected: bool) -> None:
    assert can_claim_ticket(actor, ticket) is expected


@pytest.mark.parametrize(
    ("actor", "ticket", "expected"),
    [
        (AGENT, CLAIMED_TICKET, True),
        (OTHER_AGENT, CLAIMED_TICKET, False),
        (REQUESTER, CLAIMED_TICKET, False),
        (AGENT, OPEN_TICKET, False),
        (AGENT, RESOLVED_TICKET, False),
    ],
)
def test_release_permission(actor: Actor, ticket: TicketState, expected: bool) -> None:
    assert can_release_ticket(actor, ticket) is expected


def test_only_agents_change_priority() -> None:
    assert can_change_priority(AGENT) is True
    assert can_change_priority(REQUESTER) is False


@pytest.mark.parametrize(
    ("actor", "ticket", "requested_status", "expected"),
    [
        (AGENT, OPEN_TICKET, TicketStatus.OPEN, StatusChangeDecision.UNCHANGED),
        (AGENT, CLAIMED_TICKET, TicketStatus.RESOLVED, StatusChangeDecision.ALLOWED),
        (OTHER_AGENT, CLAIMED_TICKET, TicketStatus.RESOLVED, StatusChangeDecision.FORBIDDEN),
        (REQUESTER, CLAIMED_TICKET, TicketStatus.RESOLVED, StatusChangeDecision.FORBIDDEN),
        (AGENT, RESOLVED_TICKET, TicketStatus.IN_PROGRESS, StatusChangeDecision.ALLOWED),
        (REQUESTER, RESOLVED_TICKET, TicketStatus.IN_PROGRESS, StatusChangeDecision.ALLOWED),
        (
            OTHER_REQUESTER,
            RESOLVED_TICKET,
            TicketStatus.IN_PROGRESS,
            StatusChangeDecision.FORBIDDEN,
        ),
        (AGENT, OPEN_TICKET, TicketStatus.RESOLVED, StatusChangeDecision.INVALID_TRANSITION),
        (AGENT, OPEN_TICKET, TicketStatus.IN_PROGRESS, StatusChangeDecision.INVALID_TRANSITION),
        (AGENT, CLAIMED_TICKET, TicketStatus.OPEN, StatusChangeDecision.INVALID_TRANSITION),
        (AGENT, RESOLVED_TICKET, TicketStatus.OPEN, StatusChangeDecision.INVALID_TRANSITION),
    ],
)
def test_status_change_matrix(
    actor: Actor,
    ticket: TicketState,
    requested_status: TicketStatus,
    expected: StatusChangeDecision,
) -> None:
    assert decide_status_change(actor, ticket, requested_status) is expected
