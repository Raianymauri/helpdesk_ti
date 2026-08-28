import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import * as ticketsApi from "../api/tickets";
import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("../api/tickets");

afterEach(() => {
  vi.clearAllMocks();
});

function ticketFixture(overrides = {}) {
  return {
    id: 7,
    number: "#7",
    title: "Computador não inicia",
    description: "Ao pressionar o botão, nenhum LED acende.",
    status: "OPEN",
    priority: "MEDIUM",
    requester: { id: 1, display_name: "Maria Silva", role: "REQUESTER" },
    assignee: null,
    created_at: "2026-08-27T12:00:00Z",
    updated_at: "2026-08-27T12:00:00Z",
    comments: [],
    ...overrides,
  };
}

function renderDetailPage(authValue) {
  return renderWithAuth(
    <Routes>
      <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
    </Routes>,
    { authValue, route: "/tickets/7" },
  );
}

describe("TicketDetailPage", () => {
  it("renders user-provided text as plain text, never as HTML", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(
      ticketFixture({ description: "<script>alert('x')</script>" }),
    );

    renderDetailPage({ user: buildUser() });

    expect(await screen.findByText("<script>alert('x')</script>")).toBeInTheDocument();
    expect(document.querySelector("script[src], script:not([type])")).not.toBeInTheDocument();
  });

  it("lets an agent claim an open ticket and hides the action for a requester", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(ticketFixture());
    ticketsApi.claimTicket.mockResolvedValue(
      ticketFixture({ status: "IN_PROGRESS", assignee: { id: 9, display_name: "Ana Agente" } }),
    );

    renderDetailPage({ user: buildUser({ id: 9, role: "AGENT" }) });

    const claimButton = await screen.findByRole("button", { name: "Assumir chamado" });
    await userEvent.click(claimButton);

    await waitFor(() => expect(ticketsApi.claimTicket).toHaveBeenCalledWith(7));
    expect(await screen.findByText("Em andamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assumir chamado" })).not.toBeInTheDocument();
  });

  it("hides the claim action for a requester", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(ticketFixture());

    renderDetailPage({ user: buildUser({ id: 1, role: "REQUESTER" }) });

    await screen.findByText("Computador não inicia", { exact: false });
    expect(screen.queryByRole("button", { name: "Assumir chamado" })).not.toBeInTheDocument();
  });

  it("lets the requester reopen a resolved ticket", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(
      ticketFixture({
        status: "RESOLVED",
        assignee: { id: 9, display_name: "Ana Agente" },
      }),
    );
    ticketsApi.changeTicketStatus.mockResolvedValue(
      ticketFixture({ status: "IN_PROGRESS", assignee: { id: 9, display_name: "Ana Agente" } }),
    );

    renderDetailPage({ user: buildUser({ id: 1, role: "REQUESTER" }) });

    const reopenButton = await screen.findByRole("button", { name: "Reabrir chamado" });
    await userEvent.click(reopenButton);

    await waitFor(() => expect(ticketsApi.changeTicketStatus).toHaveBeenCalledWith(7, "IN_PROGRESS"));
  });

  it("shows a recoverable message and refreshes on a claim conflict", async () => {
    ticketsApi.fetchTicket
      .mockResolvedValueOnce(ticketFixture())
      .mockResolvedValueOnce(
        ticketFixture({ status: "IN_PROGRESS", assignee: { id: 5, display_name: "Bruno Agente" } }),
      );
    ticketsApi.claimTicket.mockRejectedValue(
      new ApiError(409, "TICKET_ALREADY_CLAIMED", "Este chamado já foi assumido por outro agente."),
    );

    renderDetailPage({ user: buildUser({ id: 9, role: "AGENT" }) });

    const claimButton = await screen.findByRole("button", { name: "Assumir chamado" });
    await userEvent.click(claimButton);

    expect(await screen.findByRole("alert")).toHaveTextContent("já foi assumido por outro agente");
    await waitFor(() => expect(screen.getByText("Bruno Agente")).toBeInTheDocument());
  });

  it("prevents a duplicate comment submission and preserves the text on failure", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(ticketFixture());
    let rejectComment;
    ticketsApi.addTicketComment.mockReturnValue(
      new Promise((_resolve, reject) => (rejectComment = reject)),
    );

    renderDetailPage({ user: buildUser() });
    await screen.findByText("Computador não inicia", { exact: false });

    await userEvent.type(screen.getByLabelText("Adicionar comentário"), "Testei outra tomada.");
    const submitButton = screen.getByRole("button", { name: "Adicionar comentário" });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    expect(ticketsApi.addTicketComment).toHaveBeenCalledTimes(1);
    rejectComment(new Error("falhou"));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Adicionar comentário")).toHaveValue("Testei outra tomada.");
  });

  it("appends the comment returned by the server", async () => {
    ticketsApi.fetchTicket.mockResolvedValue(ticketFixture());
    ticketsApi.addTicketComment.mockResolvedValue(
      ticketFixture({
        comments: [
          {
            id: 1,
            author: { id: 1, display_name: "Maria Silva", role: "REQUESTER" },
            body: "Testei outra tomada.",
            created_at: "2026-08-27T13:00:00Z",
          },
        ],
      }),
    );

    renderDetailPage({ user: buildUser() });
    await screen.findByText("Computador não inicia", { exact: false });

    await userEvent.type(screen.getByLabelText("Adicionar comentário"), "Testei outra tomada.");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar comentário" }));

    expect(await screen.findByText("Testei outra tomada.")).toBeInTheDocument();
  });
});
