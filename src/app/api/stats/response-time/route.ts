import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export async function GET(req: Request) {
  await requireCurrentUser();
  const url = new URL(req.url);
  const months = Number(url.searchParams.get("range")?.replace("m", "") ?? 12);
  const locationId = url.searchParams.get("locationId");

  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const locationFilter = locationId && locationId !== "all"
    ? sql`AND c.location_id = ${locationId}`
    : sql``;

  // For each conversation that started in the range, compute:
  //   first_inbound = MIN(sent_at) for direction='inbound'
  //   first_outbound = MIN(sent_at) for direction='outbound' AFTER first_inbound
  // Response time (seconds) = first_outbound - first_inbound.
  // Then group by month-of-first-inbound and take the median.
  const rawRows = await db.execute(sql`
    WITH response_pairs AS (
      SELECT
        DATE_TRUNC('month', first_in.sent_at) AS month_bucket,
        EXTRACT(EPOCH FROM (first_out.sent_at - first_in.sent_at)) AS response_seconds
      FROM (
        SELECT conversation_id, MIN(sent_at) AS sent_at
          FROM ${schema.messages}
         WHERE direction = 'inbound'
         GROUP BY conversation_id
      ) AS first_in
      JOIN (
        SELECT m.conversation_id, MIN(m.sent_at) AS sent_at
          FROM ${schema.messages} m
         WHERE direction = 'outbound'
         GROUP BY conversation_id
      ) AS first_out ON first_out.conversation_id = first_in.conversation_id
      JOIN ${schema.conversations} c ON c.id = first_in.conversation_id
      WHERE first_out.sent_at > first_in.sent_at
        AND first_in.sent_at >= ${start}
        AND first_in.sent_at <  ${now}
        ${locationFilter}
    )
    SELECT month_bucket,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds) AS median_seconds
      FROM response_pairs
     GROUP BY month_bucket
     ORDER BY month_bucket ASC
  `);
  const rows =
    (rawRows as unknown as { rows?: unknown[] }).rows ??
    (rawRows as unknown as unknown[]);

  const data: { m: string; v: number }[] = [];
  for (const r of rows) {
    const row = r as { month_bucket: string | Date; median_seconds: string | number };
    const d = new Date(row.month_bucket);
    data.push({
      m: MONTH_LABELS[d.getMonth()],
      v: Math.round((Number(row.median_seconds) / 60) * 10) / 10, // minutes, 1 decimal
    });
  }

  return NextResponse.json({ data });
}
