import { aliasedTable, and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { publish } from "@/lib/pusher/server";

export const runtime = "nodejs";

async function assertOwnership(conversationId: string, userId: string) {
  const rows = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.conversations.locationId))
    .where(and(eq(schema.conversations.id, conversationId), eq(schema.locations.createdBy, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();
  if (!(await assertOwnership(id, user.id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const author = aliasedTable(schema.users, "author");
  const rows = await db
    .select({
      id: schema.notes.id,
      body: schema.notes.body,
      mentions: schema.notes.mentions,
      createdAt: schema.notes.createdAt,
      authorId: schema.notes.authorId,
      authorName: author.name,
      authorInitials: author.initials,
      authorTone: author.tone,
    })
    .from(schema.notes)
    .leftJoin(author, eq(author.id, schema.notes.authorId))
    .where(eq(schema.notes.conversationId, id))
    .orderBy(asc(schema.notes.createdAt));

  return NextResponse.json({ items: rows });
}

type CreateNoteBody = {
  body?: string;
  mentions?: string[];
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();
  if (!(await assertOwnership(id, user.id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let payload: CreateNoteBody;
  try {
    payload = (await req.json()) as CreateNoteBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const body = payload.body?.trim();
  if (!body) {
    return NextResponse.json({ error: "empty note" }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.notes)
    .values({
      conversationId: id,
      authorId: user.id,
      body,
      mentions: payload.mentions ?? [],
    })
    .returning();

  // Fan-out to the conversation channel so the panel updates everywhere
  await publish(`private-conversation-${id}`, "note:added", {
    conversationId: id,
    note: {
      ...row,
      authorName: user.name,
      authorInitials: user.initials,
      authorTone: user.tone,
    },
  });

  return NextResponse.json({ note: row });
}
