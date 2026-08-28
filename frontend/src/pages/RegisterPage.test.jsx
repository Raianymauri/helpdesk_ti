import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { RegisterPage } from "./RegisterPage";

function renderRegisterPage(authValue) {
  return renderWithAuth(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/tickets" element={<p>Lista de chamados</p>} />
      <Route path="/login" element={<p>Página de login</p>} />
    </Routes>,
    { authValue, route: "/register" },
  );
}

async function fillValidForm(password = "senha-forte-1") {
  await userEvent.type(screen.getByLabelText("Nome"), "Maria Silva");
  await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
  await userEvent.type(screen.getByLabelText("Senha"), password);
  await userEvent.type(screen.getByLabelText("Confirmar senha"), password);
}

describe("RegisterPage", () => {
  it("validates name length and password length before submitting", async () => {
    const register = vi.fn();
    renderRegisterPage({ register });

    await userEvent.type(screen.getByLabelText("Nome"), "A");
    await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
    await userEvent.type(screen.getByLabelText("Senha"), "curta12");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "curta12");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText(/O nome deve ter entre/)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("rejects mismatched password confirmation", async () => {
    const register = vi.fn();
    renderRegisterPage({ register });

    await userEvent.type(screen.getByLabelText("Nome"), "Maria Silva");
    await userEvent.type(screen.getByLabelText("E-mail"), "maria@example.test");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-forte-1");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "outra-senha");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("does not submit twice and preserves data on failure", async () => {
    let rejectRegister;
    const register = vi.fn(
      () => new Promise((_resolve, reject) => (rejectRegister = reject)),
    );
    renderRegisterPage({ register });

    await fillValidForm();
    const submitButton = screen.getByRole("button", { name: "Criar conta" });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    expect(register).toHaveBeenCalledTimes(1);
    rejectRegister(new Error("falhou"));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Nome")).toHaveValue("Maria Silva");
  });

  it("shows a field error when the e-mail is already registered", async () => {
    const register = vi
      .fn()
      .mockRejectedValue(new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Este e-mail já está cadastrado."));
    renderRegisterPage({ register });

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Este e-mail já está cadastrado.")).toBeInTheDocument();
  });

  it("navigates to the ticket list after a successful registration", async () => {
    const register = vi.fn().mockResolvedValue(buildUser());
    renderRegisterPage({ register });

    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(screen.getByText("Lista de chamados")).toBeInTheDocument());
  });

  it("links back to the login page", async () => {
    renderRegisterPage({ register: vi.fn() });

    await userEvent.click(screen.getByRole("link", { name: "Entrar" }));

    expect(await screen.findByText("Página de login")).toBeInTheDocument();
  });
});
