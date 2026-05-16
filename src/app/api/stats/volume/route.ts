import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30 };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: Request) {
  await requireCurrentUser();
  const url = new URL(req.url);
  const days = RANGE_DAYS[url.searchParams.get("range") ?? "7d"] ?? 7;
  const locationId = url.searchParams.get("locationId");

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const locationFilter = locationId && locationId !== "all"
    ? sql`AND ${schema.conversations.locationId} = ${locationId}`
    : sql``;

  // Counts grouped by day-of-week + direction within the range
  const rawRows = await db.execute(sql`
    SELECT EXTRACT(DOW FROM m.sent_at)::int AS dow,
           m.direction,
           COUNT(*)::int AS count
      FROM ${schema.messages} m
      JOIN ${schema.conversations} c ON c.id = m.conversation_id
     WHERE m.sent_at >= ${start}
       AND m.sent_at <  ${now}
       ${locationFilter}
     GROUP BY dow, m.direction
  `);
  const rows =
    (rawRows as unknown as { rows?: unknown[] }).rows ??
    (rawRows as unknown as unknown[]);

  // Mon..Sun ordering (per design.md §4.2 — week starts Monday)
  const order = [1, 2, 3, 4, 5, 6, 0];
  const buckets: Record<number, { inbound: number; outbound: number }> = {};
  for (let i = 0; i < 7; i += 1) buckets[i] = { inbound: 0, outbound: 0 };
  for (const r of rows) {
    const row = r as { dow: number; direction: string; count: number };
    if (!(row.dow in buckets)) continue;
    if (row.direction === "inbound") buckets[row.dow].inbound = row.count;
    else if (row.direction === "outbound") buckets[row.dow].outbound = row.count;
  }

  const data = order.map((dow) => ({
    day: DAY_LABELS[dow],
    inbound: buckets[dow].inbound,
    outbound: buckets[dow].outbound,
  }));

  return NextResponse.json({ data });
}
