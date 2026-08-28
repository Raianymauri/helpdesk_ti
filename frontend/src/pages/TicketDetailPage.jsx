import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";

import { ApiError } from "../api/client";
import {
  addTicketComment,
  changeTicketPriority,
  changeTicketStatus,
  claimTicket,
  fetchTicket,
  releaseTicket,
} from "../api/tickets";
import { useAuth } from "../auth/AuthContext";
import { usePageHeading } from "../components/PageTitle";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_OPTIONS,
  formatTicketDateTime,
} from "../domain/tickets";

function canClaim(ticket, user) {
  return user.role === "AGENT" && ticket.status === "OPEN" && !ticket.assignee;
}

function canRelease(ticket, user) {
  return user.role === "AGENT" && ticket.status === "IN_PROGRESS" && ticket.assignee?.id === user.id;
}

function canResolve(ticket, user) {
  return user.role === "AGENT" && ticket.status === "IN_PROGRESS" && ticket.assignee?.id === user.id;
}

function canReopen(ticket, user) {
  return (
    ticket.status === "RESOLVED" &&
    (ticket.assignee?.id === user.id || ticket.requester.id === user.id)
  );
}

function canChangePriority(user) {
  return user.role === "AGENT";
}

function TicketView({ ticketId, onRetry }) {
  const { user } = useAuth();

  const [loadState, setLoadState] = useState("loading");
  const [ticket, setTicket] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isMutating, setIsMutating] = useState(false);

  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const commentFieldRef = useRef(null);

  const headingRef = usePageHeading(ticket ? `${ticket.number} · ${ticket.title}` : "Chamado");

  useEffect(() => {
    let isMounted = true;
    fetchTicket(ticketId)
      .then((result) => {
        if (isMounted) {
          setTicket(result);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (isMounted) setLoadState("error");
      });
    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  async function reloadTicket() {
    try {
      const result = await fetchTicket(ticketId);
      setTicket(result);
    } catch {
      setLoadState("error");
    }
  }

  async function runAction(action) {
    if (isMutating) return;
    setIsMutating(true);
    setActionError("");
    try {
      const updated = await action();
      setTicket(updated);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 409)) {
        setActionError(error.message);
        await reloadTicket();
      } else {
        setActionError("Não foi possível concluir a ação. Tente novamente.");
      }
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (isCommenting) return;
    const trimmedBody = commentBody.trim();
    if (!trimmedBody) {
      setCommentError("Escreva um comentário antes de enviar.");
      commentFieldRef.current?.focus();
      return;
    }

    setIsCommenting(true);
    setCommentError("");
    try {
      const updated = await addTicketComment(ticketId, trimmedBody);
      setTicket(updated);
      setCommentBody("");
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setCommentError(error.fields.body ?? "Comentário inválido.");
      } else {
        setCommentError("Não foi possível enviar o comentário. Tente novamente.");
      }
    } finally {
      setIsCommenting(false);
    }
  }

  if (loadState === "loading") {
    return <p role="status">Carregando chamado…</p>;
  }

  if (loadState === "error" || !ticket) {
    return (
      <div className="alert alert--error" role="alert">
        <p>Não foi possível carregar este chamado.</p>
        <button className="button button--secondary" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1}>
        <span className="ticket-number">{ticket.number}</span> · {ticket.title}
      </h1>

      {actionError && (
        <p className="alert alert--error" role="alert">
          {actionError}
        </p>
      )}

      <div className="actions-row">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>

      <dl className="definition-list">
        <dt>Solicitante</dt>
        <dd>{ticket.requester.display_name}</dd>
        <dt>Responsável</dt>
        <dd>{ticket.assignee ? ticket.assignee.display_name : "Sem responsável"}</dd>
        <dt>Criado em</dt>
        <dd>
          <time dateTime={ticket.created_at}>{formatTicketDateTime(ticket.created_at)}</time>
        </dd>
        <dt>Atualizado em</dt>
        <dd>
          <time dateTime={ticket.updated_at}>{formatTicketDateTime(ticket.updated_at)}</time>
        </dd>
      </dl>

      <h2>Descrição</h2>
      <p className="description">{ticket.description}</p>

      <div className="actions-row">
        {canClaim(ticket, user) && (
          <button
            className="button button--primary"
            type="button"
            disabled={isMutating}
            onClick={() => runAction(() => claimTicket(ticket.id))}
          >
            Assumir chamado
          </button>
        )}
        {canRelease(ticket, user) && (
          <button
            className="button button--secondary"
            type="button"
            disabled={isMutating}
            onClick={() => runAction(() => releaseTicket(ticket.id))}
          >
            Liberar chamado
          </button>
        )}
        {canResolve(ticket, user) && (
          <button
            className="button button--primary"
            type="button"
            disabled={isMutating}
            onClick={() => runAction(() => changeTicketStatus(ticket.id, "RESOLVED"))}
          >
            Marcar como resolvido
          </button>
        )}
        {canReopen(ticket, user) && (
          <button
            className="button button--secondary"
            type="button"
            disabled={isMutating}
            onClick={() => runAction(() => changeTicketStatus(ticket.id, "IN_PROGRESS"))}
          >
            Reabrir chamado
          </button>
        )}
      </div>

      {canChangePriority(user) && (
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            const nextPriority = new FormData(event.currentTarget).get("priority");
            if (nextPriority !== ticket.priority) {
              runAction(() => changeTicketPriority(ticket.id, nextPriority));
            }
          }}
        >
          <div className="field">
            <label htmlFor="priority-select">Alterar prioridade</label>
            <select id="priority-select" name="priority" defaultValue={ticket.priority} key={ticket.priority}>
              {TICKET_PRIORITY_OPTIONS.map((priorityOption) => (
                <option key={priorityOption} value={priorityOption}>
                  {TICKET_PRIORITY_LABELS[priorityOption]}
                </option>
              ))}
            </select>
          </div>
          <button className="button button--secondary" type="submit" disabled={isMutating}>
            Aplicar prioridade
          </button>
        </form>
      )}

      <h2>Comentários</h2>
      <ul className="comment-list">
        {ticket.comments.map((comment) => (
          <li key={comment.id} className="comment">
            <span className="comment__meta">
              {comment.author.display_name} em{" "}
              <time dateTime={comment.created_at}>{formatTicketDateTime(comment.created_at)}</time>
            </span>
            {comment.body}
          </li>
        ))}
        {ticket.comments.length === 0 && <li>Nenhum comentário ainda.</li>}
      </ul>

      <form className="form" onSubmit={handleCommentSubmit} noValidate>
        <div className="field">
          <label htmlFor="comment-body">Adicionar comentário</label>
          <textarea
            ref={commentFieldRef}
            id="comment-body"
            name="body"
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            aria-invalid={Boolean(commentError)}
            aria-describedby={commentError ? "comment-body-error" : undefined}
          />
          {commentError && (
            <span id="comment-body-error" className="field__error" role="alert">
              {commentError}
            </span>
          )}
        </div>
        <button className="button button--primary" type="submit" disabled={isCommenting}>
          {isCommenting ? "Enviando…" : "Adicionar comentário"}
        </button>
      </form>
    </>
  );
}

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const [retryToken, setRetryToken] = useState(0);

  return (
    <main className="app-main">
      <TicketView
        key={`${ticketId}::${retryToken}`}
        ticketId={ticketId}
        onRetry={() => setRetryToken((token) => token + 1)}
      />
    </main>
  );
}
