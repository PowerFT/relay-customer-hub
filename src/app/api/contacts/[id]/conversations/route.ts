import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { locationOwnedByOrDemo } from "@/lib/scope";

export const runtime = "nodejs";

/**
 * GET /api/contacts/:id/conversations
 *
 * Returns prior conversations for this contact across channels,
 * newest-first. Used by the contact panel's History tab.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: contactId } = await ctx.params;
  const user = await requireCurrentUser();

  const rows = await db
    .select({
      id: schema.conversations.id,
      channel: schema.conversations.channel,
      status: schema.conversations.status,
      lastMessageAt: schema.conversations.lastMessageAt,
      preview: sql<string | null>`(
        SELECT body FROM ${schema.messages} m
         WHERE m.conversation_id = ${schema.conversations.id}
         ORDER BY m.sent_at DESC NULLS LAST
         LIMIT 1
      )`,
      assigneeInitials: schema.users.initials,
      assigneeTone: schema.users.tone,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.conversations.assigneeId))
    .where(
      and(
        eq(schema.conversations.contactId, contactId),
        locationOwnedByOrDemo(user.id),
      ),
    )
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(50);

  return NextResponse.json({ items: rows });
}
