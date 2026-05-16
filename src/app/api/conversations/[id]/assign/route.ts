import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { publish } from "@/lib/pusher/server";

export const runtime = "nodejs";

type AssignBody = { assigneeId: string | null };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const actor = await requireCurrentUser();

  let payload: AssignBody;
  try {
    payload = (await req.json()) as AssignBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Ownership check
  const conv = await db
    .select({
      id: schema.conversations.id,
      locationId: schema.conversations.locationId,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, id), eq(schema.locations.createdBy, actor.id)))
    .limit(1);

  if (conv.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Resolve assignee (or null = unassign)
  let assignee: { id: string; name: string | null } | null = null;
  if (payload.assigneeId) {
    const rows = await db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, payload.assigneeId))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "assignee not found" }, { status: 400 });
    }
    assignee = rows[0];
  }

  const now = new Date();
  await db
    .update(schema.conversations)
    .set({ assigneeId: assignee?.id ?? null, updatedAt: now })
    .where(eq(schema.conversations.id, id));

  const systemBody = assignee
    ? `${actor.name ?? "An agent"} assigned this conversation to ${assignee.name ?? "an agent"}`
    : `${actor.name ?? "An agent"} unassigned this conversation`;

  const [systemRow] = await db
    .insert(schema.messages)
    .values({
      conversationId: id,
      direction: "system",
      authorId: actor.id,
      body: systemBody,
      sentAt: now,
      status: "sent",
    })
    .returning();

  await publish(`private-conversation-${id}`, "conversation:assigned", {
    conversationId: id,
    assigneeId: assignee?.id ?? null,
  });
  await publish(`private-conversation-${id}`, "message:new", {
    conversationId: id,
    locationId: conv[0].locationId,
    message: systemRow,
  });
  await publish(`private-location-${conv[0].locationId}`, "conversation:updated", {
    conversationId: id,
    assigneeId: assignee?.id ?? null,
  });

  return NextResponse.json({ ok: true, assigneeId: assignee?.id ?? null });
}
