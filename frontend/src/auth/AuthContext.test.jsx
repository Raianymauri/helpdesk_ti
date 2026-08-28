import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../api/auth";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/auth");

afterEach(() => {
  vi.clearAllMocks();
});

function Probe() {
  const { user, isLoadingSession, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoadingSession)}</span>
      <span data-testid="user">{user ? user.display_name : "anonimo"}</span>
      <button onClick={() => signIn("maria@example.test", "senha")}>entrar</button>
      <button onClick={() => signOut()}>sair</button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("loads the current session on mount", async () => {
    authApi.fetchCurrentUser.mockResolvedValue({ id: 1, display_name: "Maria Silva" });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("Maria Silva");
  });

  it("keeps the user anonymous when there is no active session", async () => {
    authApi.fetchCurrentUser.mockRejectedValue(new Error("401"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("anonimo");
  });

  it("signIn stores the returned user and signOut clears it", async () => {
    authApi.fetchCurrentUser.mockRejectedValue(new Error("401"));
    authApi.signIn.mockResolvedValue({ id: 2, display_name: "Ana Agente" });
    authApi.signOut.mockResolvedValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await act(async () => {
      screen.getByText("entrar").click();
    });
    expect(screen.getByTestId("user")).toHaveTextContent("Ana Agente");

    await act(async () => {
      screen.getByText("sair").click();
    });
    expect(screen.getByTestId("user")).toHaveTextContent("anonimo");
  });
});
