import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { listTickets } from "../api/tickets";
import { useAuth } from "../auth/AuthContext";
import { usePageHeading } from "../components/PageTitle";
import { TicketCard } from "../components/TicketCard";
import { TICKET_STATUS_LABELS, TICKET_STATUS_OPTIONS } from "../domain/tickets";

const PAGE_SIZE = 20;

function TicketFilterForm({ initialQuery, initialStatus, onSubmit, isAgent }) {
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [draftStatus, setDraftStatus] = useState(initialStatus);

  return (
    <form
      className="toolbar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draftQuery.trim(), draftStatus);
      }}
    >
      <div className="field">
        <label htmlFor="search-query">Buscar por número ou título</label>
        <input
          id="search-query"
          name="q"
          type="search"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="search-status">Status</label>
        <select
          id="search-status"
          name="status"
          value={draftStatus}
          onChange={(event) => setDraftStatus(event.target.value)}
        >
          <option value="">Todos</option>
          {TICKET_STATUS_OPTIONS.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {TICKET_STATUS_LABELS[statusOption]}
            </option>
          ))}
        </select>
      </div>
      <button className="button button--primary" type="submit">
        Buscar
      </button>
      {!isAgent && (
        <Link className="button button--secondary" to="/tickets/new">
          Novo chamado
        </Link>
      )}
    </form>
  );
}

function TicketResults({ query, status, page, retryToken, isAgent, hasActiveFilters, onClearFilters, onPageChange }) {
  const [loadState, setLoadState] = useState("loading");
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let isMounted = true;
    listTickets({ q: query || undefined, status: status || undefined, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!isMounted) return;
        setTickets(result.items);
        setTotal(result.total);
        setLoadState("ready");
      })
      .catch(() => {
        if (isMounted) setLoadState("error");
      });
    return () => {
      isMounted = false;
    };
  }, [query, status, page, retryToken]);

  if (loadState === "loading") {
    return <p role="status">Carregando chamados…</p>;
  }

  if (loadState === "error") {
    return (
      <div className="alert alert--error" role="alert">
        <p>Não foi possível carregar os chamados.</p>
        <button className="button button--secondary" type="button" onClick={() => onPageChange(page)}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (tickets.length === 0 && hasActiveFilters) {
    return (
      <div className="alert">
        <p>Nenhum chamado corresponde aos filtros.</p>
        <button className="button button--secondary" type="button" onClick={onClearFilters}>
          Limpar filtros
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <p>
        {isAgent
          ? "A fila de chamados está vazia."
          : "Você ainda não abriu nenhum chamado. Crie o primeiro clicando em “Novo chamado”."}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <ul className="ticket-list">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} showRequester={isAgent} />
        ))}
      </ul>
      <nav className="pagination" aria-label="Paginação de chamados">
        <button
          className="button button--secondary"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span aria-live="polite">
          Página {page} de {totalPages}
        </span>
        <button
          className="button button--secondary"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </nav>
    </>
  );
}

export function TicketListPage() {
  const { user } = useAuth();
  const isAgent = user.role === "AGENT";
  const pageTitle = isAgent ? "Fila de chamados" : "Meus chamados";
  const headingRef = usePageHeading(pageTitle);

  const [searchParams, setSearchParams] = useSearchParams();
  const appliedQuery = searchParams.get("q") ?? "";
  const appliedStatus = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const hasActiveFilters = Boolean(appliedQuery || appliedStatus);
  const [retryToken, setRetryToken] = useState(0);

  function applyFilters(query, status) {
    const nextParams = {};
    if (query) nextParams.q = query;
    if (status) nextParams.status = status;
    setSearchParams(nextParams);
  }

  function clearFilters() {
    setSearchParams({});
  }

  function goToPage(nextPage) {
    const nextParams = {};
    if (appliedQuery) nextParams.q = appliedQuery;
    if (appliedStatus) nextParams.status = appliedStatus;
    nextParams.page = String(nextPage);
    setSearchParams(nextParams);
    setRetryToken((token) => token + 1);
  }

  return (
    <main className="app-main">
      <h1 ref={headingRef} tabIndex={-1}>
        {pageTitle}
      </h1>

      <TicketFilterForm
        key={`${appliedQuery}::${appliedStatus}`}
        initialQuery={appliedQuery}
        initialStatus={appliedStatus}
        onSubmit={applyFilters}
        isAgent={isAgent}
      />

      <TicketResults
        key={`${appliedQuery}::${appliedStatus}::${page}::${retryToken}`}
        query={appliedQuery}
        status={appliedStatus}
        page={page}
        retryToken={retryToken}
        isAgent={isAgent}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onPageChange={goToPage}
      />
    </main>
  );
}
