import { aliasedTable, and, desc, eq, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { ghlClient } from "@/lib/ghl/client";
import { publish } from "@/lib/pusher/server";
import { locationOwnedByOrDemo } from "@/lib/scope";

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
    .where(and(eq(schema.conversations.id, id), locationOwnedByOrDemo(user.id)))
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

type SendBody = {
  tempId?: string;
  body?: string;
  attachments?: string[];
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();

  let payload: SendBody;
  try {
    payload = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const text = payload.body?.trim();
  if (!text && !payload.attachments?.length) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }

  // Ownership check + fetch HL ids in one query
  const rows = await db
    .select({
      conversationId: schema.conversations.id,
      ghlConversationId: schema.conversations.ghlConversationId,
      ghlLocationId: schema.locations.ghlLocationId,
      locationId: schema.conversations.locationId,
      ghlContactId: schema.contacts.ghlContactId,
      lastInboundAt: schema.conversations.lastInboundAt,
    })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .innerJoin(schema.contacts, eq(schema.contacts.id, schema.conversations.contactId))
    .where(and(eq(schema.conversations.id, id), locationOwnedByOrDemo(user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const conv = rows[0];

  // 24h WhatsApp window guard (client also guards; server is the source of truth).
  const now = new Date();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const insideWindow =
    conv.lastInboundAt && now.getTime() - conv.lastInboundAt.getTime() < TWENTY_FOUR_HOURS;
  if (!insideWindow) {
    return NextResponse.json(
      { error: "outside 24h window — use an approved template" },
      { status: 422 },
    );
  }

  // Send via HighLevel
  let sendResult;
  try {
    sendResult = await ghlClient.conversations.messages.send(conv.ghlLocationId, {
      conversationId: conv.ghlConversationId,
      contactId: conv.ghlContactId,
      type: "WhatsApp",
      message: text ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Persist the outbound row. The conversation update is folded in so
  // lastMessageAt stays correct without a webhook round-trip.
  const [row] = await db
    .insert(schema.messages)
    .values({
      conversationId: conv.conversationId,
      ghlMessageId: sendResult.messageId,
      direction: "outbound",
      authorId: user.id,
      body: text ?? null,
      attachments: payload.attachments ?? [],
      sentAt: now,
      status: "sent",
    })
    .onConflictDoUpdate({
      target: [schema.messages.conversationId, schema.messages.ghlMessageId],
      // If the webhook beat the API response in here, the row already
      // exists — just update the author/status to reflect we own it.
      set: { authorId: user.id, status: "sent" },
    })
    .returning();

  await db
    .update(schema.conversations)
    .set({ lastMessageAt: now, status: "open", updatedAt: now })
    .where(eq(schema.conversations.id, conv.conversationId));

  await publish(`private-conversation-${conv.conversationId}`, "message:new", {
    conversationId: conv.conversationId,
    locationId: conv.locationId,
    message: row,
  });
  await publish(`private-location-${conv.locationId}`, "message:new", {
    conversationId: conv.conversationId,
    contactId: conv.ghlContactId,
    direction: "outbound",
    sentAt: now,
  });

  return NextResponse.json({ message: row, tempId: payload.tempId ?? null });
}
