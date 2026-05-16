import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { decrypt, encrypt } from "@/lib/crypto";

const TOKEN_ENDPOINT = "https://services.leadconnectorhq.com/oauth/token";
const REFRESH_WINDOW_MS = 60_000; // refresh if <60s remaining
const MUTEX_TTL_MS = 5_000;

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export class TokenResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenResolverError";
  }
}

// Per-locationId 5-second mutex — keeps concurrent calls from triggering
// stampeding refreshes. The promise resolves to the refreshed access token.
const inflight = new Map<string, { promise: Promise<string>; expires: number }>();

async function refreshTokens(locationId: string): Promise<string> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new TokenResolverError("GHL OAuth env vars not configured");
  }

  const loc = await db.query.locations.findFirst({
    where: eq(schema.locations.ghlLocationId, locationId),
  });
  if (!loc?.refreshTokenEnc) {
    throw new TokenResolverError(`no refresh token stored for location ${locationId}`);
  }

  const refreshToken = decrypt(loc.refreshTokenEnc);
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    user_type: "Location",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    // Mark location as token_expired so the UI can prompt re-connect.
    await db
      .update(schema.locations)
      .set({ status: "token_expired" })
      .where(eq(schema.locations.ghlLocationId, locationId));
    throw new TokenResolverError(
      `refresh failed for ${locationId}: ${res.status} ${body}`,
    );
  }

  const tokens = (await res.json()) as RefreshResponse;
  await db
    .update(schema.locations)
    .set({
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: "connected",
    })
    .where(eq(schema.locations.ghlLocationId, locationId));

  return tokens.access_token;
}

function withMutex(locationId: string, run: () => Promise<string>): Promise<string> {
  const now = Date.now();
  const existing = inflight.get(locationId);
  if (existing && existing.expires > now) return existing.promise;

  const promise = run().finally(() => {
    // Always evict ourselves so the next call sees a fresh state.
    setTimeout(() => inflight.delete(locationId), 0);
  });
  inflight.set(locationId, { promise, expires: now + MUTEX_TTL_MS });
  return promise;
}

/**
 * Returns a usable access token for the given HighLevel locationId.
 *
 * - If the stored token has more than 60s of life left, decrypts and returns it.
 * - Otherwise refreshes via /oauth/token (grant_type=refresh_token), persists
 *   the new pair, and returns the new access_token.
 * - Concurrent calls for the same locationId share one refresh promise
 *   (5s TTL mutex) — keeps us from stampeding HL with duplicate refreshes.
 */
export async function getValidAccessToken(locationId: string): Promise<string> {
  const loc = await db.query.locations.findFirst({
    where: eq(schema.locations.ghlLocationId, locationId),
  });
  if (!loc?.accessTokenEnc) {
    throw new TokenResolverError(`location ${locationId} is not connected`);
  }

  const expiresIn = loc.tokenExpiresAt
    ? loc.tokenExpiresAt.getTime() - Date.now()
    : 0;
  if (expiresIn > REFRESH_WINDOW_MS) {
    return decrypt(loc.accessTokenEnc);
  }
  return withMutex(locationId, () => refreshTokens(locationId));
}

/** Bypasses the expires_in check — used by ghlFetch's 401 retry path. */
export async function forceRefreshAccessToken(locationId: string): Promise<string> {
  return withMutex(locationId, () => refreshTokens(locationId));
}

/* Resolver-injection seam preserved for the test suite (Row 9). */

export type TokenResolver = {
  getValidAccessToken: (locationId: string) => Promise<string>;
  forceRefreshAccessToken: (locationId: string) => Promise<string>;
};

const productionResolver: TokenResolver = {
  getValidAccessToken,
  forceRefreshAccessToken,
};

let activeResolver: TokenResolver = productionResolver;

export function setTokenResolver(resolver: TokenResolver) {
  activeResolver = resolver;
}

export function resetTokenResolver() {
  activeResolver = productionResolver;
}

export function getTokenResolver(): TokenResolver {
  return activeResolver;
}
