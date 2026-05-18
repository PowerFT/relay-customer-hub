import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { parseFiltersFromRequest, whereForFilters } from "@/lib/conversations/filters";

export const runtime = "nodejs";

/**
 * GET /api/channel-counts?locationId={all|id}
 *
 * Returns per-channel unread counts for the current user's accessible
 * conversations. Used by the channel rail (Row 13) and the sidebar
 * Conversations badge (replaces Row 6's stub useUnreadCount).
 *
 * MVP scope: only WhatsApp is live; other channels always read 0 because
 * we have no rows with channel = anything else yet. Schema supports them
 * so once Row N+ adds Messenger/etc., this route requires no change.
 */

type Channel =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "webchat"
  | "email"
  | "sms";

export async function GET(req: Request) {
  const user = await requireCurrentUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");

  const whereClauses = [eq(schema.conversations.status, "open")];
  if (locationId && locationId !== "all") {
    whereClauses.push(eq(schema.conversations.locationId, locationId));
  } else {
    // Limit to locations created by this user (multi-user join would go here later).
    whereClauses.push(
      sql`${schema.conversations.locationId} IN (
        SELECT id FROM ${schema.locations}
         WHERE ${schema.locations.createdBy} = ${user.id}
      )`,
    );
  }
  // Agent + channel-instance filters from the dashboard chip row. When
  // ?agents=sara is set, the rail badges narrow to Sara's conversations
  // (per spec). Channel-instance filters constrain to (channel, location)
  // pairs the same way.
  const dashboardFilters = parseFiltersFromRequest(url);
  whereClauses.push(...(await whereForFilters(dashboardFilters)));

  const rows = await db
    .select({
      channel: schema.conversations.channel,
      total: sql<number>`COALESCE(SUM(${schema.conversations.unreadCount}), 0)::int`,
    })
    .from(schema.conversations)
    .where(and(...whereClauses))
    .groupBy(schema.conversations.channel);

  const counts: Record<Channel | "all", number> = {
    all: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    tiktok: 0,
    linkedin: 0,
    webchat: 0,
    email: 0,
    sms: 0,
  };
  for (const r of rows) {
    const channel = r.channel as Channel;
    if (channel in counts) counts[channel] = r.total;
    counts.all += r.total;
  }

  return NextResponse.json(counts);
}
