import { TICKET_PRIORITY_LABELS } from "../domain/tickets";

const FILL_BY_PRIORITY = {
  LOW: "badge--fill-none",
  MEDIUM: "badge--fill-soft",
  HIGH: "badge--fill-solid",
};

export function PriorityBadge({ priority }) {
  const fillClass = FILL_BY_PRIORITY[priority] ?? "badge--fill-none";
  return (
    <span className={`badge ${fillClass}`}>
      Prioridade: {TICKET_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
