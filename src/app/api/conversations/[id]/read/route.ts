import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { ghlClient } from "@/lib/ghl/client";
import { publish } from "@/lib/pusher/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();

  // Ownership + fetch the HL ids in one query
  const rows = await db
    .select({
      conversationId: schema.conversations.id,
      ghlConversationId: schema.conversations.ghlConversationId,
      locationId: schema.conversations.locationId,
      ghlLocationId: schema.locations.ghlLocationId,
      unreadCount: schema.conversations.unreadCount,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, id), eq(schema.locations.createdBy, user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const conv = rows[0];

  if (conv.unreadCount > 0) {
    await db
      .update(schema.conversations)
      .set({ unreadCount: 0, updatedAt: new Date() })
      .where(eq(schema.conversations.id, conv.conversationId));
  }

  // Best-effort: tell HL we read it. Never fail the request on HL error —
  // local state is the source of truth for the UI.
  try {
    await ghlClient.conversations.read(conv.ghlLocationId, conv.ghlConversationId);
  } catch (err) {
    console.warn("ghl.conversations.read failed", err);
  }

  // Fan-out so the rail/sidebar badges update on every browser tab
  await publish(`private-location-${conv.locationId}`, "conversation:updated", {
    conversationId: conv.conversationId,
    unreadCount: 0,
  });

  return NextResponse.json({ ok: true });
}
