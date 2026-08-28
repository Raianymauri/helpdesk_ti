import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { fetchCurrentUser, signIn, signOut } from "./auth";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("auth api module", () => {
  it("signIn posts credentials to /auth/login", async () => {
    apiClient.post.mockResolvedValue({ id: 1 });

    await signIn("maria@example.test", "senha");

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "maria@example.test",
      password: "senha",
    });
  });

  it("signOut posts to /auth/logout", async () => {
    apiClient.post.mockResolvedValue(null);

    await signOut();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("fetchCurrentUser reads /auth/me", async () => {
    apiClient.get.mockResolvedValue({ id: 1 });

    await fetchCurrentUser();

    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
  });
});
