import { aliasedTable, and, desc, eq, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type Cursor = { sentAt: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.sentAt}|${c.id}`).toString("base64url");
}
function decodeCursor(raw: string): Cursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const [sentAt, id] = decoded.split("|");
    if (!sentAt || !id) return null;
    return { sentAt, id };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();

  // Ownership check
  const conv = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, id), eq(schema.locations.createdBy, user.id)))
    .limit(1);

  if (conv.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );

  const author = aliasedTable(schema.users, "author");

  const where = [eq(schema.messages.conversationId, id)];
  if (cursor) {
    const c = decodeCursor(cursor);
    if (c) {
      where.push(
        or(
          lt(schema.messages.sentAt, new Date(c.sentAt)),
          and(
            eq(schema.messages.sentAt, new Date(c.sentAt)),
            lt(schema.messages.id, c.id),
          ),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: schema.messages.id,
      ghlMessageId: schema.messages.ghlMessageId,
      direction: schema.messages.direction,
      body: schema.messages.body,
      attachments: schema.messages.attachments,
      sentAt: schema.messages.sentAt,
      deliveredAt: schema.messages.deliveredAt,
      readAt: schema.messages.readAt,
      status: schema.messages.status,
      authorId: schema.messages.authorId,
      authorName: author.name,
      authorInitials: author.initials,
      authorTone: author.tone,
      createdAt: schema.messages.createdAt,
    })
    .from(schema.messages)
    .leftJoin(author, eq(author.id, schema.messages.authorId))
    .where(and(...where))
    .orderBy(desc(schema.messages.sentAt), desc(schema.messages.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor({
          sentAt:
            items[items.length - 1].sentAt?.toISOString() ?? new Date(0).toISOString(),
          id: items[items.length - 1].id,
        })
      : null;

  // Return messages chronological (oldest first) — easier for the client to render
  return NextResponse.json({ items: items.reverse(), nextCursor });
}
