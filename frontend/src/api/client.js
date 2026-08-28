/** Cliente HTTP central: base URL, cookies de sessão e envelope de erro da API. */

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
  }
}

async function readErrorPayload(response) {
  try {
    const payload = await response.json();
    return payload?.detail ?? {};
  } catch {
    return {};
  }
}

async function request(path, { method = "GET", body, searchParams } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao servidor.", {});
  }

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const { code, message, fields } = await readErrorPayload(response);
    throw new ApiError(
      response.status,
      code ?? "UNKNOWN_ERROR",
      message ?? "Ocorreu um erro inesperado.",
      fields,
    );
  }

  return response.json();
}

export const apiClient = {
  get: (path, searchParams) => request(path, { method: "GET", searchParams }),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
