import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePageHeading } from "../components/PageTitle";

export function LoginPage() {
  const headingRef = usePageHeading("Entrar");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailFieldRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!email.trim() || !password) {
      setErrorMessage("Informe e-mail e senha.");
      emailFieldRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from ?? "/tickets", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
        setErrorMessage("E-mail ou senha inválidos.");
        setPassword("");
      } else {
        setErrorMessage("Não foi possível entrar agora. Tente novamente.");
      }
      emailFieldRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <p className="auth-brand">Helpdesk TI</p>
      <div className="auth-card">
        <h1 ref={headingRef} tabIndex={-1}>
          Entrar
        </h1>
        <form className="form" onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <p className="alert alert--error" role="alert">
              {errorMessage}
            </p>
          )}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              ref={emailFieldRef}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="form-footer-note">
          Ainda não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </div>
    </main>
  );
}
