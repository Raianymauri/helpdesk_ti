import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { LoginPage } from "./LoginPage";

function renderLoginPage(authValue) {
  return renderWithAuth(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/tickets" element={<p>Lista de chamados</p>} />
      <Route path="/register" element={<p>Página de cadastro</p>} />
    </Routes>,
    { authValue, route: "/login" },
  );
}

describe("LoginPage", () => {
  it("requires email and password before submitting", async () => {
    const signIn = vi.fn();
    renderLoginPage({ signIn });

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe e-mail e senha.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("prevents a duplicate submission while signing in", async () => {
    let resolveSignIn;
    const signIn = vi.fn(() => new Promise((resolve) => (resolveSignIn = resolve)));
    renderLoginPage({ signIn });

    await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-valida");
    const submitButton = screen.getByRole("button", { name: "Entrar" });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    expect(signIn).toHaveBeenCalledTimes(1);
    resolveSignIn(buildUser());
  });

  it("shows a generic message for invalid credentials and clears the password", async () => {
    const signIn = vi.fn().mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "x"));
    renderLoginPage({ signIn });

    await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
    expect(screen.getByLabelText("Senha")).toHaveValue("");
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@example.test");
  });

  it("navigates to the ticket list after a successful login", async () => {
    const signIn = vi.fn().mockResolvedValue(buildUser());
    renderLoginPage({ signIn });

    await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-valida");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Lista de chamados")).toBeInTheDocument());
  });

  it("links to the registration page", async () => {
    renderLoginPage({ signIn: vi.fn() });

    await userEvent.click(screen.getByRole("link", { name: "Criar conta" }));

    expect(await screen.findByText("Página de cadastro")).toBeInTheDocument();
  });
});
