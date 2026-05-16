import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { encrypt, verifySignature } from "@/lib/crypto";

export const runtime = "nodejs";

const STATE_COOKIE = "ghl_oauth_state";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_ENDPOINT = "https://services.leadconnectorhq.com/oauth/token";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  locationId: string;
  userId?: string;
  companyId?: string;
};

type LocationResponse = {
  location: {
    id: string;
    name?: string;
    phone?: string;
    [key: string]: unknown;
  };
};

function errorRedirect(req: Request, reason: string) {
  const target = new URL("/settings/locations", req.url);
  target.searchParams.set("error", reason);
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return errorRedirect(req, "missing_params");
  }

  // Validate state cookie
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!stateCookie || stateCookie !== stateParam) {
    return errorRedirect(req, "state_mismatch");
  }
  const stateSecret = process.env.OAUTH_STATE_SECRET;
  if (!stateSecret) return errorRedirect(req, "server_misconfigured");

  const parts = stateParam.split(".");
  if (parts.length !== 3) return errorRedirect(req, "state_malformed");
  const [nonce, issuedAt, signature] = parts;
  if (!verifySignature(`${nonce}.${issuedAt}`, signature, stateSecret)) {
    return errorRedirect(req, "state_bad_signature");
  }
  if (Date.now() - Number(issuedAt) > STATE_MAX_AGE_MS) {
    return errorRedirect(req, "state_expired");
  }

  const currentUser = await requireCurrentUser();

  // Exchange code for tokens (form-encoded body, not JSON)
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return errorRedirect(req, "server_misconfigured");
  }

  const tokenForm = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    user_type: "Location",
  });

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenForm.toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("ghl token exchange failed", tokenRes.status, body);
    return errorRedirect(req, "token_exchange_failed");
  }

  const tokens = (await tokenRes.json()) as TokenResponse;
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Fetch location details for name + phone — uses the access token we just got
  let locationName: string | null = null;
  let locationPhone: string | null = null;
  try {
    const locRes = await fetch(
      `https://services.leadconnectorhq.com/locations/${tokens.locationId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      },
    );
    if (locRes.ok) {
      const json = (await locRes.json()) as LocationResponse;
      locationName = json.location.name ?? null;
      locationPhone = json.location.phone ?? null;
    } else {
      console.warn("ghl location fetch failed", locRes.status);
    }
  } catch (err) {
    console.warn("ghl location fetch threw", err);
  }

  await db
    .insert(schema.locations)
    .values({
      ghlLocationId: tokens.locationId,
      name: locationName,
      whatsappNumber: locationPhone,
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      tokenExpiresAt,
      createdBy: currentUser.id,
      status: "connected",
    })
    .onConflictDoUpdate({
      target: schema.locations.ghlLocationId,
      set: {
        name: locationName,
        whatsappNumber: locationPhone,
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: encrypt(tokens.refresh_token),
        tokenExpiresAt,
        connectedAt: new Date(),
        status: "connected",
      },
    });

  const target = new URL("/settings/locations", req.url);
  target.searchParams.set("connected", tokens.locationId);
  return NextResponse.redirect(target);
}
