import { aliasedTable, and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/conversations?locationId=&channel=&status=&search=&cursor=&limit=30
 *
 * Returns one paginated page of the user's open/snoozed/closed conversations,
 * joined to the parent contact and (if assigned) the assignee user row.
 * The preview field is the most-recent message body, computed with a
 * lateral subselect so we get exactly one row per conversation without
 * an N+1.
 *
 * Cursor format: base64 of `${ISO sentAt}|${id}`, ordered by
 * (lastMessageAt DESC, id DESC). The id tiebreaker keeps pagination
 * stable when two conversations share a millisecond.
 */

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

type Cursor = { lastMessageAt: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.lastMessageAt}|${c.id}`).toString("base64url");
}
function decodeCursor(raw: string): Cursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const [lastMessageAt, id] = decoded.split("|");
    if (!lastMessageAt || !id) return null;
    return { lastMessageAt, id };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await requireCurrentUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status") ?? "open";
  const search = url.searchParams.get("search")?.trim();
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );

  // assignee join
  const assignee = aliasedTable(schema.users, "assignee");

  const whereClauses = [];
  if (locationId && locationId !== "all") {
    whereClauses.push(eq(schema.conversations.locationId, locationId));
  } else {
    whereClauses.push(
      sql`${schema.conversations.locationId} IN (
        SELECT id FROM ${schema.locations}
         WHERE ${schema.locations.createdBy} = ${user.id}
      )`,
    );
  }
  if (channel && channel !== "all") {
    whereClauses.push(eq(schema.conversations.channel, channel));
  }
  if (status === "open" || status === "snoozed" || status === "closed") {
    whereClauses.push(eq(schema.conversations.status, status));
  }
  if (search) {
    whereClauses.push(
      or(
        ilike(schema.contacts.name, `%${search}%`),
        ilike(schema.contacts.phone, `%${search}%`),
        ilike(schema.contacts.email, `%${search}%`),
      )!,
    );
  }
  if (cursor) {
    const c = decodeCursor(cursor);
    if (c) {
      whereClauses.push(
        or(
          lt(schema.conversations.lastMessageAt, new Date(c.lastMessageAt)),
          and(
            eq(schema.conversations.lastMessageAt, new Date(c.lastMessageAt)),
            lt(schema.conversations.id, c.id),
          ),
        )!,
      );
    }
  }

  // Lateral preview — most recent message body per conversation
  const preview = sql<string | null>`(
    SELECT body FROM ${schema.messages} m
     WHERE m.conversation_id = ${schema.conversations.id}
     ORDER BY m.sent_at DESC NULLS LAST
     LIMIT 1
  )`;

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
      preview,
      contactId: schema.contacts.id,
      contactName: schema.contacts.name,
      contactPhone: schema.contacts.phone,
      contactEmail: schema.contacts.email,
      contactTone: schema.contacts.tone,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assigneeInitials: assignee.initials,
      assigneeTone: assignee.tone,
    })
    .from(schema.conversations)
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.conversations.contactId))
    .leftJoin(assignee, eq(assignee.id, schema.conversations.assigneeId))
    .where(and(...whereClauses))
    .orderBy(desc(schema.conversations.lastMessageAt), desc(schema.conversations.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor({
          lastMessageAt:
            items[items.length - 1].lastMessageAt?.toISOString() ?? new Date(0).toISOString(),
          id: items[items.length - 1].id,
        })
      : null;

  // Tab counts in one cheap query
  const countRows = await db
    .select({
      status: schema.conversations.status,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(schema.conversations)
    .where(
      and(
        ...whereClauses.filter((_, i) => i !== whereClauses.length - 1 - (cursor ? 0 : -1)),
      ),
    )
    .groupBy(schema.conversations.status);

  const counts: Record<string, number> = { open: 0, snoozed: 0, closed: 0 };
  for (const r of countRows) {
    if (r.status in counts) counts[r.status] = r.total;
  }

  return NextResponse.json({ items, nextCursor, counts });
}

// Suppress unused warning — kept for future use even though not in current code path
void inArray;
