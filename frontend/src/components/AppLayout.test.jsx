import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { AppLayout } from "./AppLayout";

function renderLayout(authValue) {
  return renderWithAuth(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/tickets" element={<p>Conteúdo da lista</p>} />
        <Route path="/tickets/new" element={<p>Conteúdo de criação</p>} />
      </Route>
    </Routes>,
    { authValue, route: "/tickets" },
  );
}

describe("AppLayout", () => {
  it("shows the user name, role and a working sign-out button", async () => {
    const signOut = vi.fn().mockResolvedValue(null);
    renderLayout({ user: buildUser({ display_name: "Maria Silva", role: "REQUESTER" }), signOut });

    expect(screen.getByText("Maria Silva · Solicitante")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("keeps navigation limited to wayfinding, without a page action", () => {
    renderLayout({ user: buildUser({ role: "REQUESTER" }) });

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(nav).getByRole("link", { name: "Chamados" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Novo chamado" })).not.toBeInTheDocument();
  });
});
