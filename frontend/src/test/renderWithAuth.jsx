import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { AuthContext } from "../auth/AuthContext";

export function buildUser(overrides = {}) {
  return {
    id: 1,
    display_name: "Maria Silva",
    email: "maria@example.test",
    role: "REQUESTER",
    ...overrides,
  };
}

export function renderWithAuth(ui, { authValue, route = "/", ...renderOptions } = {}) {
  const resolvedAuthValue = {
    user: null,
    isLoadingSession: false,
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    ...authValue,
  };

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={resolvedAuthValue}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
    renderOptions,
  );
}
