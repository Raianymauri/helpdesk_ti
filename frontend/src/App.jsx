import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TicketCreatePage } from "./pages/TicketCreatePage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketListPage } from "./pages/TicketListPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/tickets" element={<TicketListPage />} />
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
