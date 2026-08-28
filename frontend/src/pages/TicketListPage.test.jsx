import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as ticketsApi from "../api/tickets";
import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { TicketListPage } from "./TicketListPage";

vi.mock("../api/tickets");

afterEach(() => {
  vi.clearAllMocks();
});

function ticketFixture(overrides = {}) {
  return {
    id: 1,
    number: "#1",
    title: "Computador não inicia",
    status: "OPEN",
    priority: "MEDIUM",
    requester: { id: 1, display_name: "Maria Silva", role: "REQUESTER" },
    assignee: null,
    created_at: "2026-08-27T12:00:00Z",
    updated_at: "2026-08-27T12:00:00Z",
    ...overrides,
  };
}

describe("TicketListPage", () => {
  it("shows a loading state and then the content", async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [ticketFixture()],
      page: 1,
      page_size: 20,
      total: 1,
    });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser() } });

    expect(screen.getByRole("status")).toHaveTextContent("Carregando chamados…");
    expect(await screen.findByText(/Computador não inicia/)).toBeInTheDocument();
  });

  it("shows the requester heading and hides the requester column", async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [ticketFixture()],
      page: 1,
      page_size: 20,
      total: 1,
    });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser({ role: "REQUESTER" }) } });

    expect(await screen.findByRole("heading", { name: "Meus chamados" })).toBeInTheDocument();
    expect(screen.queryByText(/Solicitante:/)).not.toBeInTheDocument();
  });

  it("shows the agent heading and the requester column", async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [ticketFixture()],
      page: 1,
      page_size: 20,
      total: 1,
    });

    renderWithAuth(<TicketListPage />, {
      authValue: { user: buildUser({ id: 9, role: "AGENT" }) },
    });

    expect(await screen.findByRole("heading", { name: "Fila de chamados" })).toBeInTheDocument();
    expect(await screen.findByText("Solicitante: Maria Silva")).toBeInTheDocument();
  });

  it("shows the empty state without filters for a requester", async () => {
    ticketsApi.listTickets.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser() } });

    expect(await screen.findByText(/ainda não abriu nenhum chamado/)).toBeInTheDocument();
  });

  it("recovers from an error via the retry button", async () => {
    ticketsApi.listTickets
      .mockRejectedValueOnce(new Error("falhou"))
      .mockResolvedValueOnce({ items: [ticketFixture()], page: 1, page_size: 20, total: 1 });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser() } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText(/Computador não inicia/)).toBeInTheDocument();
  });

  it("applies search and status filters to the query string and request", async () => {
    ticketsApi.listTickets.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser() } });
    await waitFor(() => expect(ticketsApi.listTickets).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("Buscar por número ou título"), "monitor");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "OPEN");
    expect(ticketsApi.listTickets).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(ticketsApi.listTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "monitor", status: "OPEN", page: 1 }),
      ),
    );
  });

  it("clears filters and shows the filtered empty state", async () => {
    ticketsApi.listTickets.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });

    renderWithAuth(<TicketListPage />, { authValue: { user: buildUser() }, route: "/tickets?q=xyz" });

    expect(await screen.findByText("Nenhum chamado corresponde aos filtros.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    await waitFor(() =>
      expect(ticketsApi.listTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: undefined, status: undefined }),
      ),
    );
  });

  it("navigates between pages without losing the applied filter", async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [ticketFixture()],
      page: 1,
      page_size: 20,
      total: 40,
    });

    renderWithAuth(<TicketListPage />, {
      authValue: { user: buildUser() },
      route: "/tickets?status=OPEN",
    });

    const pagination = await screen.findByRole("navigation", { name: "Paginação de chamados" });
    expect(within(pagination).getByText("Página 1 de 2")).toBeInTheDocument();
    await userEvent.click(within(pagination).getByRole("button", { name: "Próxima" }));

    await waitFor(() =>
      expect(ticketsApi.listTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "OPEN", page: 2 }),
      ),
    );
  });
});
