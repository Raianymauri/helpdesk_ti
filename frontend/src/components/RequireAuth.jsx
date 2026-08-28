import { Navigate, useLocation } from "react-router";

import { useAuth } from "../auth/AuthContext";

export function RequireAuth({ children }) {
  const { user, isLoadingSession } = useAuth();
  const location = useLocation();

  if (isLoadingSession) {
    return (
      <p role="status" aria-live="polite">
        Carregando sessão…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
