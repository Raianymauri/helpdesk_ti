import { Link } from "react-router";

import { usePageHeading } from "../components/PageTitle";

export function NotFoundPage() {
  const headingRef = usePageHeading("Página não encontrada");

  return (
    <main className="app-main">
      <h1 ref={headingRef} tabIndex={-1}>
        Página não encontrada
      </h1>
      <p>
        <Link to="/tickets">Voltar para a lista de chamados</Link>
      </p>
    </main>
  );
}
