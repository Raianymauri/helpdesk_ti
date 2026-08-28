import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import {
  addTicketComment,
  changeTicketPriority,
  changeTicketStatus,
  claimTicket,
  createTicket,
  fetchTicket,
  listTickets,
  releaseTicket,
} from "./tickets";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("tickets api module", () => {
  it("listTickets maps camelCase params to the API's query params", async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await listTickets({ q: "monitor", status: "OPEN", page: 2, pageSize: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/tickets", {
      q: "monitor",
      status: "OPEN",
      page: 2,
      page_size: 10,
    });
  });

  it("createTicket posts title, description and priority", async () => {
    apiClient.post.mockResolvedValue({ id: 1 });

    await createTicket({ title: "t", description: "d", priority: "HIGH" });

    expect(apiClient.post).toHaveBeenCalledWith("/tickets", {
      title: "t",
      description: "d",
      priority: "HIGH",
    });
  });

  it("fetchTicket, claimTicket and releaseTicket target the ticket by id", async () => {
    apiClient.get.mockResolvedValue({ id: 1 });
    apiClient.post.mockResolvedValue({ id: 1 });
    apiClient.delete.mockResolvedValue({ id: 1 });

    await fetchTicket(1);
    await claimTicket(1);
    await releaseTicket(1);

    expect(apiClient.get).toHaveBeenCalledWith("/tickets/1");
    expect(apiClient.post).toHaveBeenCalledWith("/tickets/1/claim");
    expect(apiClient.delete).toHaveBeenCalledWith("/tickets/1/claim");
  });

  it("changeTicketStatus and changeTicketPriority send a partial PATCH", async () => {
    apiClient.patch.mockResolvedValue({ id: 1 });

    await changeTicketStatus(1, "RESOLVED");
    await changeTicketPriority(1, "HIGH");

    expect(apiClient.patch).toHaveBeenCalledWith("/tickets/1", { status: "RESOLVED" });
    expect(apiClient.patch).toHaveBeenCalledWith("/tickets/1", { priority: "HIGH" });
  });

  it("addTicketComment posts the comment body", async () => {
    apiClient.post.mockResolvedValue({ id: 1 });

    await addTicketComment(1, "Testei outra tomada.");

    expect(apiClient.post).toHaveBeenCalledWith("/tickets/1/comments", {
      body: "Testei outra tomada.",
    });
  });
});
