import { z } from "zod";

import {
  contactResponse,
  contactUpsertResponse,
  conversationSearchResponse,
  conversationSchema,
  locationResponse,
  messageSendResponse,
  messagesListResponse,
} from "./schemas";
import { getTokenResolver } from "./tokens";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-04-15";

export class GhlApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(`GHL ${status} ${path}: ${message}`);
    this.name = "GhlApiError";
  }
}

export class RateLimitError extends GhlApiError {
  constructor(
    public readonly retryAfterSeconds: number,
    path: string,
    body?: unknown,
  ) {
    super(429, path, `rate limited (retry after ${retryAfterSeconds}s)`, body);
    this.name = "RateLimitError";
  }
}

type FetchInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: FetchInit["query"]): string {
  const url = new URL(GHL_BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Single chokepoint for all HighLevel API calls.
 *
 * - Adds Authorization, Version, Accept, Content-Type
 * - 401 → force-refresh token, retry once
 * - 429 → throws RateLimitError with retry-after seconds parsed
 * - non-2xx → throws GhlApiError
 * - logs method, path, status, ms
 */
export async function ghlFetch<T = unknown>(
  locationId: string,
  path: string,
  init: FetchInit = {},
): Promise<T> {
  const resolver = getTokenResolver();
  let token = await resolver.getValidAccessToken(locationId);
  const started = Date.now();
  const method = (init.method ?? "GET").toUpperCase();

  const doRequest = async (bearer: string) => {
    const { query, headers, ...rest } = init;
    const response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        Version: GHL_API_VERSION,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
    });
    return response;
  };

  let response = await doRequest(token);

  if (response.status === 401) {
    token = await resolver.forceRefreshAccessToken(locationId);
    response = await doRequest(token);
  }

  const ms = Date.now() - started;
  // Log to stdout — server-side observability via Vercel Function logs.
  console.log(JSON.stringify({ ghl: true, method, path, status: response.status, ms }));

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "60");
    let body: unknown = undefined;
    try {
      body = await response.json();
    } catch {
      // ignore
    }
    throw new RateLimitError(Number.isFinite(retryAfter) ? retryAfter : 60, path, body);
  }

  if (!response.ok) {
    let body: unknown = undefined;
    let message = response.statusText;
    try {
      body = await response.json();
      const maybeMessage = (body as { message?: string })?.message;
      if (maybeMessage) message = maybeMessage;
    } catch {
      // body might not be JSON
    }
    throw new GhlApiError(response.status, path, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function call<T>(
  schema: z.ZodType<T>,
  locationId: string,
  path: string,
  init?: FetchInit,
): Promise<T> {
  const raw = await ghlFetch(locationId, path, init);
  return schema.parse(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed endpoints — these are the ONLY way the rest of the app should hit GHL.
// ─────────────────────────────────────────────────────────────────────────────

export const conversations = {
  search(
    locationId: string,
    params: {
      contactId?: string;
      status?: "open" | "closed" | "all";
      assignedTo?: string;
      limit?: number;
      startAfter?: string;
    } = {},
  ) {
    return call(conversationSearchResponse, locationId, "/conversations/search", {
      query: { locationId, ...params },
    });
  },

  get(locationId: string, conversationId: string) {
    return call(conversationSchema, locationId, `/conversations/${conversationId}`);
  },

  read(locationId: string, conversationId: string) {
    return ghlFetch(locationId, `/conversations/${conversationId}/read`, {
      method: "POST",
    });
  },

  messages: {
    list(
      locationId: string,
      conversationId: string,
      params: { limit?: number; lastMessageId?: string } = {},
    ) {
      return call(
        messagesListResponse,
        locationId,
        `/conversations/${conversationId}/messages`,
        { query: params },
      );
    },

    send(
      locationId: string,
      body: {
        conversationId: string;
        contactId?: string;
        type: "WhatsApp" | "SMS" | "Email";
        message?: string;
        html?: string;
        subject?: string;
        attachments?: string[];
      },
    ) {
      return call(messageSendResponse, locationId, "/conversations/messages", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  },
};

export const contacts = {
  get(locationId: string, contactId: string) {
    return call(contactResponse, locationId, `/contacts/${contactId}`);
  },

  upsert(
    locationId: string,
    body: {
      phone?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      tags?: string[];
    },
  ) {
    return call(contactUpsertResponse, locationId, "/contacts/upsert", {
      method: "POST",
      body: JSON.stringify({ locationId, ...body }),
    });
  },
};

export const locations = {
  get(locationId: string) {
    return call(locationResponse, locationId, `/locations/${locationId}`);
  },
};

export const ghlClient = { conversations, contacts, locations };
