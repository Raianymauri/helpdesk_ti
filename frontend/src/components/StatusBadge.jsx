import { TICKET_STATUS_LABELS } from "../domain/tickets";

const FILL_BY_STATUS = {
  OPEN: "badge--fill-none",
  IN_PROGRESS: "badge--fill-soft",
  RESOLVED: "badge--fill-solid",
};

export function StatusBadge({ status }) {
  const fillClass = FILL_BY_STATUS[status] ?? "badge--fill-none";
  return <span className={`badge ${fillClass}`}>{TICKET_STATUS_LABELS[status] ?? status}</span>;
}
