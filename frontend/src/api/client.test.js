import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "./client";

function stubFetch(implementation) {
  vi.stubGlobal("fetch", vi.fn(implementation));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiClient", () => {
  it("sends credentials and parses a successful JSON response", async () => {
    stubFetch(async (url, init) => {
      expect(String(url)).toContain("/api/tickets");
      expect(init.credentials).toBe("same-origin");
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    const result = await apiClient.get("/tickets");

    expect(result).toEqual({ items: [] });
  });

  it("appends only defined search params", async () => {
    stubFetch(async (url) => {
      expect(url.searchParams.get("q")).toBe("monitor");
      expect(url.searchParams.has("status")).toBe(false);
      return { ok: true, status: 200, json: async () => ({}) };
    });

    await apiClient.get("/tickets", { q: "monitor", status: undefined });
  });

  it("throws an ApiError built from the error envelope", async () => {
    stubFetch(async () => ({
      ok: false,
      status: 422,
      json: async () => ({
        detail: { code: "VALIDATION_ERROR", message: "Campo inválido.", fields: { title: "obrigatório" } },
      }),
    }));

    await expect(apiClient.post("/tickets", {})).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      fields: { title: "obrigatório" },
    });
  });

  it("returns null for a 204 response without a body", async () => {
    stubFetch(async () => ({ ok: true, status: 204, json: async () => ({}) }));

    await expect(apiClient.delete("/tickets/1/claim")).resolves.toBeNull();
  });

  it("wraps a network failure as a recoverable ApiError", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(apiClient.get("/tickets")).rejects.toBeInstanceOf(ApiError);
  });
});
