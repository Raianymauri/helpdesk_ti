/** Funções de domínio para autenticação. */

import { apiClient } from "./client";

export function signIn(email, password) {
  return apiClient.post("/auth/login", { email, password });
}

export function signOut() {
  return apiClient.post("/auth/logout");
}

export function fetchCurrentUser() {
  return apiClient.get("/auth/me");
}
