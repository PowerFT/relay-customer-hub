import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const REVOKE_ENDPOINT = "https://services.leadconnectorhq.com/oauth/revoke";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();

  const loc = await db.query.locations.findFirst({
    where: and(eq(schema.locations.id, id), eq(schema.locations.createdBy, user.id)),
  });
  if (!loc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Best-effort revoke at HighLevel — never let a failure here block the
  // local soft-delete. If HL is down or the token's already invalid, we
  // still want the row marked disconnected so the UI updates.
  if (loc.accessTokenEnc) {
    try {
      const accessToken = decrypt(loc.accessTokenEnc);
      const res = await fetch(REVOKE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GHL_CLIENT_ID ?? "",
          client_secret: process.env.GHL_CLIENT_SECRET ?? "",
          token: accessToken,
        }).toString(),
      });
      if (!res.ok) {
        console.warn("ghl revoke non-200", res.status, await res.text());
      }
    } catch (err) {
      console.warn("ghl revoke threw", err);
    }
  }

  await db
    .update(schema.locations)
    .set({
      status: "disconnected",
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
    })
    .where(eq(schema.locations.id, id));

  return NextResponse.json({ ok: true });
}
