import { aliasedTable, and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { locationOwnedByOrDemo } from "@/lib/scope";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();

  const assignee = aliasedTable(schema.users, "assignee");

  const rows = await db
    .select({
      id: schema.conversations.id,
      locationId: schema.conversations.locationId,
      channel: schema.conversations.channel,
      status: schema.conversations.status,
      priority: schema.conversations.priority,
      lastMessageAt: schema.conversations.lastMessageAt,
      lastInboundAt: schema.conversations.lastInboundAt,
      unreadCount: schema.conversations.unreadCount,
      pinned: schema.conversations.pinned,
      tags: schema.conversations.tags,
      snoozedUntil: schema.conversations.snoozedUntil,
      contactId: schema.contacts.id,
      contactName: schema.contacts.name,
      contactPhone: schema.contacts.phone,
      contactEmail: schema.contacts.email,
      contactTone: schema.contacts.tone,
      contactInstagram: schema.contacts.instagramHandle,
      contactCustomFields: schema.contacts.customFields,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeInitials: assignee.initials,
      assigneeTone: assignee.tone,
      // Caller-side ownership check
      ownedByCurrentUser: sql<boolean>`(
        ${schema.locations.createdBy} = ${user.id}
      )`,
    })
    .from(schema.conversations)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.conversations.contactId))
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .leftJoin(assignee, eq(assignee.id, schema.conversations.assigneeId))
    .where(and(eq(schema.conversations.id, id), locationOwnedByOrDemo(user.id)));

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
