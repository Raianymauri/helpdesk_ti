import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { createTicket } from "../api/tickets";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageHeading } from "../components/PageTitle";
import { TICKET_PRIORITY_LABELS, TICKET_PRIORITY_OPTIONS } from "../domain/tickets";

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 160;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 5000;

function validate(title, description) {
  const errors = {};
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  if (trimmedTitle.length < TITLE_MIN_LENGTH || trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `O título deve ter entre ${TITLE_MIN_LENGTH} e ${TITLE_MAX_LENGTH} caracteres.`;
  }
  if (
    trimmedDescription.length < DESCRIPTION_MIN_LENGTH ||
    trimmedDescription.length > DESCRIPTION_MAX_LENGTH
  ) {
    errors.description = `A descrição deve ter entre ${DESCRIPTION_MIN_LENGTH} e ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  return errors;
}

export function TicketCreatePage() {
  const { user } = useAuth();
  const headingRef = usePageHeading("Novo chamado");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = validate(title, description);
    setFieldErrors(errors);
    setSubmitError("");
    if (errors.title) {
      titleFieldRef.current?.focus();
      return;
    }
    if (errors.description) {
      descriptionFieldRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setFieldErrors(error.fields);
        setSubmitError("Verifique os campos destacados.");
        titleFieldRef.current?.focus();
      } else {
        setSubmitError("Não foi possível criar o chamado agora. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user.role !== "REQUESTER") {
    return <Navigate to="/tickets" replace />;
  }

  return (
    <main className="app-main">
      <h1 ref={headingRef} tabIndex={-1}>
        Novo chamado
      </h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <p className="alert alert--error" role="alert">
            {submitError}
          </p>
        )}
        <div className="field">
          <label htmlFor="ticket-title">Título</label>
          <input
            ref={titleFieldRef}
            id="ticket-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "ticket-title-error" : undefined}
          />
          {fieldErrors.title && (
            <span id="ticket-title-error" className="field__error">
              {fieldErrors.title}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="ticket-description">Descrição</label>
          <textarea
            ref={descriptionFieldRef}
            id="ticket-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? "ticket-description-error" : undefined}
          />
          {fieldErrors.description && (
            <span id="ticket-description-error" className="field__error">
              {fieldErrors.description}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="ticket-priority">Prioridade</label>
          <select
            id="ticket-priority"
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {TICKET_PRIORITY_OPTIONS.map((priorityOption) => (
              <option key={priorityOption} value={priorityOption}>
                {TICKET_PRIORITY_LABELS[priorityOption]}
              </option>
            ))}
          </select>
        </div>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar chamado"}
        </button>
      </form>
    </main>
  );
}
