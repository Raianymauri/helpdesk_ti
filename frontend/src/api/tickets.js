/** Funções de domínio para chamados. */

import { apiClient } from "./client";

export function listTickets({ q, status, page, pageSize } = {}) {
  return apiClient.get("/tickets", { q, status, page, page_size: pageSize });
}

export function createTicket({ title, description, priority }) {
  return apiClient.post("/tickets", { title, description, priority });
}

export function fetchTicket(ticketId) {
  return apiClient.get(`/tickets/${ticketId}`);
}

export function claimTicket(ticketId) {
  return apiClient.post(`/tickets/${ticketId}/claim`);
}

export function releaseTicket(ticketId) {
  return apiClient.delete(`/tickets/${ticketId}/claim`);
}

export function changeTicketStatus(ticketId, ticketStatus) {
  return apiClient.patch(`/tickets/${ticketId}`, { status: ticketStatus });
}

export function changeTicketPriority(ticketId, priority) {
  return apiClient.patch(`/tickets/${ticketId}`, { priority });
}

export function addTicketComment(ticketId, body) {
  return apiClient.post(`/tickets/${ticketId}/comments`, { body });
}
