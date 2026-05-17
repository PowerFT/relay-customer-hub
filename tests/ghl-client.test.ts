import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GhlApiError,
  RateLimitError,
  conversations,
  ghlFetch,
} from "@/lib/ghl/client";
import { setTokenResolver } from "@/lib/ghl/tokens";

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;
let fetchMock: FetchMock;

function mockResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setTokenResolver({
    getValidAccessToken: async () => "test-access-token",
    forceRefreshAccessToken: async () => "test-refreshed-token",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ghlFetch headers", () => {
  it("sends Authorization, Version, Accept, Content-Type", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

    await ghlFetch("loc_1", "/test");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://services.leadconnectorhq.com/test");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-access-token");
    expect(headers.Version).toBe("2021-04-15");
    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("appends query params via URL", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}));
    await ghlFetch("loc_1", "/x", { query: { a: 1, b: "two", c: null } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://services.leadconnectorhq.com/x?a=1&b=two");
  });
});

describe("ghlFetch error handling", () => {
  it("force-refreshes and retries on 401", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ message: "unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const result = await ghlFetch<{ ok: boolean }>("loc_1", "/retry");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBe("Bearer test-refreshed-token");
  });

  it("throws RateLimitError on 429 with parsed Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ message: "slow down" }, { status: 429, headers: { "Retry-After": "12" } }),
    );

    await expect(ghlFetch("loc_1", "/limited")).rejects.toBeInstanceOf(RateLimitError);

    fetchMock.mockResolvedValueOnce(
      mockResponse({}, { status: 429, headers: { "Retry-After": "12" } }),
    );
    await expect(ghlFetch("loc_1", "/limited")).rejects.toMatchObject({ retryAfterSeconds: 12 });
  });

  it("throws GhlApiError on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ message: "not found" }, { status: 404 }),
    );

    await expect(ghlFetch("loc_1", "/missing")).rejects.toBeInstanceOf(GhlApiError);
  });
});

describe("typed endpoints validate response", () => {
  it("conversations.search parses + returns typed shape", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        conversations: [
          {
            id: "conv_1",
            contactId: "ct_1",
            locationId: "loc_1",
            lastMessageBody: "hi",
            unreadCount: 0,
          },
        ],
        total: 1,
      }),
    );

    const result = await conversations.search("loc_1");
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].id).toBe("conv_1");
    expect(result.total).toBe(1);
  });

  it("conversations.search rejects malformed responses", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ conversations: [{ id: 123 /* should be string */ }] }),
    );

    await expect(conversations.search("loc_1")).rejects.toThrow(/conversations/);
  });
});
