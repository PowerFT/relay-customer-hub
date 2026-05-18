import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test-only DB pokes for the Row 26 acceptance flow. Bearer-gated, same
 * as the other /api/admin/* routes. Two actions:
 *
 *   expire-snooze  → set snoozed_until to 1 minute ago on the target
 *                    conversation so the next cron tick (or manual
 *                    POST to /api/cron/unsnooze) re-opens it. Used in
 *                    step 8 of the acceptance test.
 *
 *   age-inbound    → set last_inbound_at to N hours ago (default 25)
 *                    on the target so the composer flips to the
 *                    24h-window-closed state. Used in step 10.
 *
 *   POST /api/admin/test-poke
 *   Authorization: Bearer ${CRON_SECRET}
 *   Body: { conversationId, action: "expire-snooze" | "age-inbound", hours? }
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { conversationId?: string; action?: string; hours?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  if (!body.conversationId || !body.action) {
    return NextResponse.json(
      { error: "conversationId and action required" },
      { status: 400 },
    );
  }

  if (body.action === "expire-snooze") {
    const result = await db
      .update(schema.conversations)
      .set({ snoozedUntil: new Date(Date.now() - 60_000) })
      .where(eq(schema.conversations.id, body.conversationId))
      .returning({ id: schema.conversations.id, status: schema.conversations.status });
    if (result.length === 0) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conversation: result[0] });
  }

  if (body.action === "age-inbound") {
    const hours = body.hours ?? 25;
    const newTs = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await db
      .update(schema.conversations)
      .set({ lastInboundAt: newTs })
      .where(eq(schema.conversations.id, body.conversationId))
      .returning({ id: schema.conversations.id, lastInboundAt: schema.conversations.lastInboundAt });
    if (result.length === 0) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conversation: result[0] });
  }

  return NextResponse.json(
    { error: `unknown action "${body.action}" — expected "expire-snooze" or "age-inbound"` },
    { status: 400 },
  );
}
