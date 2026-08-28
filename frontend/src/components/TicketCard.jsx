import { Link } from "react-router";

import { formatTicketDateTime } from "../domain/tickets";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

export function TicketCard({ ticket, showRequester }) {
  return (
    <li className="ticket-card">
      <div className="ticket-card__header">
        <span className="ticket-card__title">
          <Link to={`/tickets/${ticket.id}`}>
            {ticket.number} · {ticket.title}
          </Link>
        </span>
        <div className="ticket-card__badges">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>
      <div className="ticket-card__meta">
        {showRequester && <span>Solicitante: {ticket.requester.display_name}</span>}
        <span>Responsável: {ticket.assignee ? ticket.assignee.display_name : "Sem responsável"}</span>
        <span>
          Atualizado em{" "}
          <time dateTime={ticket.updated_at}>{formatTicketDateTime(ticket.updated_at)}</time>
        </span>
      </div>
    </li>
  );
}
