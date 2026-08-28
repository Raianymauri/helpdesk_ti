import { NavLink, Outlet } from "react-router";

import { useAuth } from "../auth/AuthContext";
import { RequireAuth } from "./RequireAuth";

const ROLE_LABELS = {
  REQUESTER: "Solicitante",
  AGENT: "Agente",
};

function AuthenticatedShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <p className="app-brand">Helpdesk TI</p>
          <div className="app-header__user">
            <span>
              {user.display_name} · {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <button className="button button--secondary" type="button" onClick={signOut}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <nav className="app-nav" aria-label="Navegação principal">
        <div className="app-nav__inner">
          <NavLink to="/tickets" end>
            Chamados
          </NavLink>
          {user.role === "REQUESTER" && <NavLink to="/tickets/new">Novo chamado</NavLink>}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

export function AppLayout() {
  return (
    <RequireAuth>
      <AuthenticatedShell />
    </RequireAuth>
  );
}
