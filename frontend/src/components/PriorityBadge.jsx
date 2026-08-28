import { TICKET_PRIORITY_LABELS } from "../domain/tickets";

export function PriorityBadge({ priority }) {
  const isHighPriority = priority === "HIGH";
  return (
    <span className={isHighPriority ? "badge badge--priority-high" : "badge"}>
      Prioridade: {TICKET_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
