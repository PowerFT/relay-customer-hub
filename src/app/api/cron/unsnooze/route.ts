import { and, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { publish } from "@/lib/pusher/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsnooze cron handler — invoked every 5 minutes by the GitHub Actions
 * workflow at .github/workflows/unsnooze.yml. Finds conversations whose
 * snooze window has elapsed, flips them back to 'open', writes a system
 * message, and fires the realtime fan-out so any open UI updates.
 *
 * Vercel Hobby caps native crons at once-daily, so we drive this from
 * GitHub Actions instead. Both GET and POST are accepted — the workflow
 * uses POST; manual curl/inspection can use either.
 *
 * Protection: `Authorization: Bearer ${CRON_SECRET}`. The repo secret of
 * the same name supplies the header.
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select({
      id: schema.conversations.id,
      locationId: schema.conversations.locationId,
    })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.status, "snoozed"),
        lte(schema.conversations.snoozedUntil, now),
      ),
    );

  if (due.length === 0) {
    return NextResponse.json({ ok: true, reopened: 0 });
  }

  for (const conv of due) {
    await db
      .update(schema.conversations)
      .set({ status: "open", snoozedUntil: null, updatedAt: now })
      .where(eq(schema.conversations.id, conv.id));

    const [systemRow] = await db
      .insert(schema.messages)
      .values({
        conversationId: conv.id,
        direction: "system",
        body: "Snooze expired — conversation reopened",
        sentAt: now,
        status: "sent",
      })
      .returning();

    await publish(`private-conversation-${conv.id}`, "message:new", {
      conversationId: conv.id,
      locationId: conv.locationId,
      message: systemRow,
    });
    await publish(`private-location-${conv.locationId}`, "conversation:updated", {
      conversationId: conv.id,
      status: "open",
    });
  }

  return NextResponse.json({ ok: true, reopened: due.length });
}

export const GET = handle;
export const POST = handle;
