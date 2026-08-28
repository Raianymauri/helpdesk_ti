import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as ticketsApi from "../api/tickets";
import { ApiError } from "../api/client";
import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { TicketCreatePage } from "./TicketCreatePage";

vi.mock("../api/tickets");

afterEach(() => {
  vi.clearAllMocks();
});

function renderCreatePage(authValue) {
  return renderWithAuth(
    <Routes>
      <Route path="/tickets/new" element={<TicketCreatePage />} />
      <Route path="/tickets/:ticketId" element={<p>Detalhe do chamado</p>} />
      <Route path="/tickets" element={<p>Lista de chamados</p>} />
    </Routes>,
    { authValue, route: "/tickets/new" },
  );
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText("Título"), "Computador não liga");
  await userEvent.type(
    screen.getByLabelText("Descrição"),
    "Ao pressionar o botão, nenhum LED acende.",
  );
}

describe("TicketCreatePage", () => {
  it("redirects agents away from the creation page", () => {
    renderCreatePage({ user: buildUser({ role: "AGENT" }) });

    expect(screen.getByText("Lista de chamados")).toBeInTheDocument();
  });

  it("validates length limits before submitting", async () => {
    renderCreatePage({ user: buildUser() });

    await userEvent.type(screen.getByLabelText("Título"), "abcd");
    await userEvent.click(screen.getByRole("button", { name: "Criar chamado" }));

    expect(await screen.findByText(/O título deve ter entre/)).toBeInTheDocument();
    expect(ticketsApi.createTicket).not.toHaveBeenCalled();
  });

  it("does not submit twice and preserves data on failure", async () => {
    let rejectCreate;
    ticketsApi.createTicket.mockReturnValue(
      new Promise((_resolve, reject) => (rejectCreate = reject)),
    );
    renderCreatePage({ user: buildUser() });

    await fillValidForm();
    const submitButton = screen.getByRole("button", { name: "Criar chamado" });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    expect(ticketsApi.createTicket).toHaveBeenCalledTimes(1);
    rejectCreate(new Error("falhou"));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Título")).toHaveValue("Computador não liga");
  });

  it("shows field errors returned by the API", async () => {
    ticketsApi.createTicket.mockRejectedValue(
      new ApiError(422, "VALIDATION_ERROR", "Verifique os campos.", {
        title: "Título já utilizado.",
      }),
    );
    renderCreatePage({ user: buildUser() });

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Criar chamado" }));

    expect(await screen.findByText("Título já utilizado.")).toBeInTheDocument();
  });

  it("navigates to the created ticket on success", async () => {
    ticketsApi.createTicket.mockResolvedValue({ id: 42 });
    renderCreatePage({ user: buildUser() });

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Criar chamado" }));

    await waitFor(() => expect(screen.getByText("Detalhe do chamado")).toBeInTheDocument());
  });
});
