import { TICKET_STATUS_LABELS } from "../domain/tickets";

export function StatusBadge({ status }) {
  return <span className="badge">{TICKET_STATUS_LABELS[status] ?? status}</span>;
}
