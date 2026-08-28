import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageHeading } from "../components/PageTitle";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;

function validate(displayName, password) {
  const errors = {};
  const trimmedName = displayName.trim();
  if (trimmedName.length < NAME_MIN_LENGTH || trimmedName.length > NAME_MAX_LENGTH) {
    errors.display_name = `O nome deve ter entre ${NAME_MIN_LENGTH} e ${NAME_MAX_LENGTH} caracteres.`;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return errors;
}

export function RegisterPage() {
  const headingRef = usePageHeading("Criar conta");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameFieldRef = useRef(null);
  const emailFieldRef = useRef(null);
  const passwordFieldRef = useRef(null);
  const confirmPasswordFieldRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = validate(displayName, password);
    if (!email.trim()) {
      errors.email = "Informe um e-mail.";
    }
    if (password !== confirmPassword) {
      errors.confirm_password = "As senhas não coincidem.";
    }
    setFieldErrors(errors);
    setSubmitError("");

    if (errors.display_name) {
      nameFieldRef.current?.focus();
      return;
    }
    if (errors.email) {
      emailFieldRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordFieldRef.current?.focus();
      return;
    }
    if (errors.confirm_password) {
      confirmPasswordFieldRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await register(displayName.trim(), email.trim(), password);
      navigate("/tickets", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_ALREADY_REGISTERED") {
        setFieldErrors({ email: "Este e-mail já está cadastrado." });
        emailFieldRef.current?.focus();
      } else if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setFieldErrors(error.fields);
        setSubmitError("Verifique os campos destacados.");
        nameFieldRef.current?.focus();
      } else {
        setSubmitError("Não foi possível criar sua conta agora. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <p className="auth-brand">Helpdesk TI</p>
      <div className="auth-card">
        <h1 ref={headingRef} tabIndex={-1}>
          Criar conta
        </h1>
        <form className="form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <p className="alert alert--error" role="alert">
              {submitError}
            </p>
          )}
          <div className="field">
            <label htmlFor="display-name">Nome</label>
            <input
              ref={nameFieldRef}
              id="display-name"
              name="display_name"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.display_name)}
              aria-describedby={fieldErrors.display_name ? "display-name-error" : undefined}
            />
            {fieldErrors.display_name && (
              <span id="display-name-error" className="field__error" role="alert">
                {fieldErrors.display_name}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="register-email">E-mail</label>
            <input
              ref={emailFieldRef}
              id="register-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            />
            {fieldErrors.email && (
              <span id="register-email-error" className="field__error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="register-password">Senha</label>
            <input
              ref={passwordFieldRef}
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
            />
            {fieldErrors.password && (
              <span id="register-password-error" className="field__error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirmar senha</label>
            <input
              ref={confirmPasswordFieldRef}
              id="confirm-password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.confirm_password)}
              aria-describedby={fieldErrors.confirm_password ? "confirm-password-error" : undefined}
            />
            {fieldErrors.confirm_password && (
              <span id="confirm-password-error" className="field__error" role="alert">
                {fieldErrors.confirm_password}
              </span>
            )}
          </div>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>
        <p className="form-footer-note">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
