import { isNotNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot admin endpoint to NULL the encrypted OAuth tokens on every
 * location row. Run this AFTER rotating ENCRYPTION_KEY in production —
 * the old ciphertexts can no longer be decrypted, so they're dead data
 * that would otherwise trip the token-refresh path. Every connected
 * location has to re-OAuth to repopulate them.
 *
 *   POST /api/admin/rotate-tokens
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Idempotent — already-null rows are unaffected. Same gating as
 * /api/admin/seed.
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await db
      .update(schema.locations)
      .set({
        accessTokenEnc: null,
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        status: "token_expired",
      })
      .where(
        or(
          isNotNull(schema.locations.accessTokenEnc),
          isNotNull(schema.locations.refreshTokenEnc),
        ),
      )
      .returning({ id: schema.locations.id, name: schema.locations.name });
    return NextResponse.json({
      ok: true,
      cleared: result.length,
      locations: result.map((r) => r.name ?? r.id),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Silence the unused-import warning for the symbol kept for future use.
void sql;
