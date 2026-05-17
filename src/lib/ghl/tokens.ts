/**
 * Token resolver for the HighLevel API client.
 *
 * This file is the seam between the typed API client (Row 9) and the OAuth
 * token storage layer (Row 7). Row 9 ships a stub; Row 7 will replace the
 * body of getValidAccessToken with the real implementation:
 *   1. Look up the encrypted access_token + refresh_token from the locations table
 *   2. If expires_in < 60s, POST to /oauth/token with grant_type=refresh_token
 *   3. Decrypt + return the access_token
 *   4. 5-second mutex per locationId to prevent thundering refresh
 */

export class TokenResolverNotImplementedError extends Error {
  constructor(locationId: string) {
    super(
      `getValidAccessToken('${locationId}') is not yet wired up. ` +
        `See BUILD_PLAN.md row 7 — token storage + refresh.`,
    );
    this.name = "TokenResolverNotImplementedError";
  }
}

export async function getValidAccessToken(locationId: string): Promise<string> {
  throw new TokenResolverNotImplementedError(locationId);
}

/**
 * Used by the 401-retry path in ghlFetch. Row 7 will replace this with a
 * forced refresh that bypasses the expires_in check.
 */
export async function forceRefreshAccessToken(locationId: string): Promise<string> {
  throw new TokenResolverNotImplementedError(locationId);
}

/**
 * Test seam — allows the client's tests (and Row 7's integration) to inject
 * a token resolver without going through the DB. The default exported
 * resolver throws; production callers replace it via `setTokenResolver`.
 */
export type TokenResolver = {
  getValidAccessToken: (locationId: string) => Promise<string>;
  forceRefreshAccessToken: (locationId: string) => Promise<string>;
};

let activeResolver: TokenResolver = {
  getValidAccessToken,
  forceRefreshAccessToken,
};

export function setTokenResolver(resolver: TokenResolver) {
  activeResolver = resolver;
}

export function getTokenResolver(): TokenResolver {
  return activeResolver;
}
