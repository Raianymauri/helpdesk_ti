"""Persistência de chamados e comentários."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import User
from app.database import Base, utc_now
from app.tickets.rules import DEFAULT_TICKET_PRIORITY, TicketStatus


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')", name="ck_tickets_status"),
        CheckConstraint("priority IN ('LOW', 'MEDIUM', 'HIGH')", name="ck_tickets_priority"),
        CheckConstraint("length(title) BETWEEN 5 AND 160", name="ck_tickets_title"),
        CheckConstraint("length(description) BETWEEN 10 AND 5000", name="ck_tickets_description"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=TicketStatus.OPEN)
    priority: Mapped[str] = mapped_column(
        String(8), nullable=False, default=DEFAULT_TICKET_PRIORITY
    )
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)

    requester: Mapped[User] = relationship(foreign_keys=[requester_id], lazy="joined")
    assignee: Mapped[User | None] = relationship(foreign_keys=[assignee_id], lazy="joined")
    # Carregada sob demanda: a listagem serializa o resumo e não toca em comentários.
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="ticket", order_by="(Comment.created_at, Comment.id)"
    )


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (CheckConstraint("length(body) BETWEEN 1 AND 2000", name="ck_comments_body"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)

    ticket: Mapped[Ticket] = relationship(back_populates="comments")
    author: Mapped[User] = relationship(lazy="joined")
