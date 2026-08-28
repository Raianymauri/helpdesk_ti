/** Traduções e rótulos de domínio compartilhados entre páginas e componentes. */

export const TICKET_STATUS_LABELS = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Resolvido",
};

export const TICKET_PRIORITY_LABELS = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const TICKET_STATUS_OPTIONS = Object.keys(TICKET_STATUS_LABELS);
export const TICKET_PRIORITY_OPTIONS = Object.keys(TICKET_PRIORITY_LABELS);

export function formatTicketDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
