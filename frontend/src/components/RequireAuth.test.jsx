import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { buildUser, renderWithAuth } from "../test/renderWithAuth";
import { RequireAuth } from "./RequireAuth";

describe("RequireAuth", () => {
  it("redirects to /login when there is no authenticated user", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/tickets"
          element={
            <RequireAuth>
              <p>Conteúdo protegido</p>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>,
      { authValue: { user: null }, route: "/tickets" },
    );

    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("renders the protected content for an authenticated user", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/tickets"
          element={
            <RequireAuth>
              <p>Conteúdo protegido</p>
            </RequireAuth>
          }
        />
      </Routes>,
      { authValue: { user: buildUser() }, route: "/tickets" },
    );

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("shows a loading message while the session is being resolved", () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/tickets"
          element={
            <RequireAuth>
              <p>Conteúdo protegido</p>
            </RequireAuth>
          }
        />
      </Routes>,
      { authValue: { user: null, isLoadingSession: true }, route: "/tickets" },
    );

    expect(screen.getByRole("status")).toHaveTextContent("Carregando sessão…");
  });
});
