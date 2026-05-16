import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/users — lightweight directory for assignment + @mention pickers.
 * MVP: single workspace; everyone in the users table is selectable.
 */
export async function GET() {
  await requireCurrentUser();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      initials: schema.users.initials,
      tone: schema.users.tone,
      role: schema.users.role,
    })
    .from(schema.users)
    .orderBy(schema.users.name);
  return NextResponse.json({ users: rows });
}
