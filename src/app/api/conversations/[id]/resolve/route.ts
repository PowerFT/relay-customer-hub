import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { publish } from "@/lib/pusher/server";
import { locationOwnedByOrDemo } from "@/lib/scope";

export const runtime = "nodejs";

async function getOwnedConversation(id: string, userId: string) {
  const rows = await db
    .select({
      id: schema.conversations.id,
      locationId: schema.conversations.locationId,
      status: schema.conversations.status,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, id), locationOwnedByOrDemo(userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function writeSystemMessage(
  conversationId: string,
  authorId: string,
  body: string,
) {
  const now = new Date();
  const [row] = await db
    .insert(schema.messages)
    .values({
      conversationId,
      direction: "system",
      authorId,
      body,
      sentAt: now,
      status: "sent",
    })
    .returning();
  return row;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const actor = await requireCurrentUser();

  const conv = await getOwnedConversation(id, actor.id);
  if (!conv) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .update(schema.conversations)
    .set({ status: "closed", snoozedUntil: null, updatedAt: new Date() })
    .where(eq(schema.conversations.id, id));

  const systemRow = await writeSystemMessage(id, actor.id, `Resolved by ${actor.name ?? "an agent"}`);

  await publish(`private-conversation-${id}`, "message:new", {
    conversationId: id,
    locationId: conv.locationId,
    message: systemRow,
  });
  await publish(`private-location-${conv.locationId}`, "conversation:updated", {
    conversationId: id,
    status: "closed",
  });

  return NextResponse.json({ ok: true });
}

/** DELETE re-opens (used by ⌘Z undo). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const actor = await requireCurrentUser();

  const conv = await getOwnedConversation(id, actor.id);
  if (!conv) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .update(schema.conversations)
    .set({ status: "open", updatedAt: new Date() })
    .where(eq(schema.conversations.id, id));

  const systemRow = await writeSystemMessage(
    id,
    actor.id,
    `Re-opened by ${actor.name ?? "an agent"}`,
  );

  await publish(`private-conversation-${id}`, "message:new", {
    conversationId: id,
    locationId: conv.locationId,
    message: systemRow,
  });
  await publish(`private-location-${conv.locationId}`, "conversation:updated", {
    conversationId: id,
    status: "open",
  });

  return NextResponse.json({ ok: true });
}
