import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { renderWithAuth } from "./test/renderWithAuth";

describe("App", () => {
  it("shows a simple not-found page for an unknown route", () => {
    renderWithAuth(<App />, { route: "/rota-inexistente" });

    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lista de chamados/i })).toBeInTheDocument();
  });
});
