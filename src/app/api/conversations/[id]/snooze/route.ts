import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { publish } from "@/lib/pusher/server";

export const runtime = "nodejs";

type SnoozeBody = { until: string };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const actor = await requireCurrentUser();

  let payload: SnoozeBody;
  try {
    payload = (await req.json()) as SnoozeBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const until = new Date(payload.until);
  if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
    return NextResponse.json({ error: "snooze until must be in the future" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: schema.conversations.id,
      locationId: schema.conversations.locationId,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, id), eq(schema.locations.createdBy, actor.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const conv = rows[0];

  await db
    .update(schema.conversations)
    .set({ status: "snoozed", snoozedUntil: until, updatedAt: new Date() })
    .where(eq(schema.conversations.id, id));

  const [systemRow] = await db
    .insert(schema.messages)
    .values({
      conversationId: id,
      direction: "system",
      authorId: actor.id,
      body: `Snoozed until ${format(until, "EEE d LLL p")} by ${actor.name ?? "an agent"}`,
      sentAt: new Date(),
      status: "sent",
    })
    .returning();

  await publish(`private-conversation-${id}`, "message:new", {
    conversationId: id,
    locationId: conv.locationId,
    message: systemRow,
  });
  await publish(`private-location-${conv.locationId}`, "conversation:updated", {
    conversationId: id,
    status: "snoozed",
    snoozedUntil: until.toISOString(),
  });

  return NextResponse.json({ ok: true, until: until.toISOString() });
}
