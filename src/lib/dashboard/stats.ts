import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db, schema } from "@/db";

/**
 * Server-side stats computation. The same logic is exposed at
 * GET /api/stats for any future client-fetched usage (e.g. range toggle
 * without a full page reload). Pulled out into a shared module so the
 * dashboard server component and the API route stay byte-for-byte
 * consistent.
 */

const RANGE_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export type DashboardStats = {
  range: string;
  totalMessages: {
    value: number;
    inbound: number;
    outbound: number;
    trendPct: number;
  };
  unread: {
    value: number;
    assigned: number;
    unassigned: number;
    trendPct: number;
  };
  active: {
    value: number;
    open: number;
    snoozed: number;
    trendPct: number;
  };
  resolvedToday: {
    value: number;
    resolved: number;
    escalated: number;
    trendPct: number;
  };
};

function trendPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function daysAgo(now: Date, days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

export async function fetchStats(opts: {
  range?: string;
  locationId?: string;
} = {}): Promise<DashboardStats> {
  const rangeKey = opts.range ?? "7d";
  const days = RANGE_DAYS[rangeKey] ?? 7;
  const locationFilter =
    opts.locationId && opts.locationId !== "all" ? opts.locationId : null;

  const now = new Date();
  const periodStart = daysAgo(now, days);
  const prevStart = daysAgo(now, days * 2);

  const locWhere = locationFilter
    ? [eq(schema.conversations.locationId, locationFilter)]
    : [];
  const messageLocationJoin = locationFilter
    ? sql`AND ${schema.conversations.locationId} = ${locationFilter}`
    : sql``;

  // Messages: current + previous period via single grouped query
  const messagesRaw = await db.execute(sql`
    SELECT m.direction,
           CASE WHEN m.sent_at >= ${periodStart} THEN 'current' ELSE 'previous' END AS period,
           COUNT(*)::int AS count
      FROM ${schema.messages} m
      JOIN ${schema.conversations} c ON c.id = m.conversation_id
     WHERE m.sent_at >= ${prevStart}
       AND m.sent_at <  ${now}
       ${messageLocationJoin}
     GROUP BY m.direction, period
  `);
  let inbound = 0;
  let outbound = 0;
  let prevTotal = 0;
  // Neon returns { rows: [...] } from db.execute
  const messageRows = (messagesRaw as unknown as { rows?: unknown[] }).rows ?? (messagesRaw as unknown as unknown[]);
  for (const r of messageRows) {
    const row = r as { direction: string; period: string; count: number };
    if (row.period === "current") {
      if (row.direction === "inbound") inbound += row.count;
      else if (row.direction === "outbound") outbound += row.count;
    } else {
      prevTotal += row.count;
    }
  }
  const totalMessages = inbound + outbound;

  // Unread
  const unreadRows = await db
    .select({
      assigned: sql<number>`COALESCE(SUM(CASE WHEN ${schema.conversations.assigneeId} IS NOT NULL THEN ${schema.conversations.unreadCount} ELSE 0 END), 0)::int`,
      unassigned: sql<number>`COALESCE(SUM(CASE WHEN ${schema.conversations.assigneeId} IS NULL THEN ${schema.conversations.unreadCount} ELSE 0 END), 0)::int`,
    })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.status, "open"), ...locWhere));
  const unreadAssigned = unreadRows[0]?.assigned ?? 0;
  const unreadUnassigned = unreadRows[0]?.unassigned ?? 0;

  // Active
  const activeRows = await db
    .select({
      open: sql<number>`COALESCE(SUM(CASE WHEN ${schema.conversations.status} = 'open' THEN 1 ELSE 0 END), 0)::int`,
      snoozed: sql<number>`COALESCE(SUM(CASE WHEN ${schema.conversations.status} = 'snoozed' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(schema.conversations)
    .where(
      and(
        inArray(schema.conversations.status, ["open", "snoozed"]),
        ...locWhere,
      ),
    );
  const activeOpen = activeRows[0]?.open ?? 0;
  const activeSnoozed = activeRows[0]?.snoozed ?? 0;

  // Resolved today + trend
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = daysAgo(today, 1);

  const resolvedTodayRows = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      escalated: sql<number>`COALESCE(SUM(CASE WHEN ${schema.conversations.priority} = 'high' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.status, "closed"),
        gte(schema.conversations.updatedAt, today),
        ...locWhere,
      ),
    );
  const resolvedToday = resolvedTodayRows[0]?.total ?? 0;
  const resolvedEscalated = resolvedTodayRows[0]?.escalated ?? 0;

  const resolvedYesterdayRows = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.status, "closed"),
        gte(schema.conversations.updatedAt, yesterday),
        lt(schema.conversations.updatedAt, today),
        ...locWhere,
      ),
    );
  const resolvedYesterday = resolvedYesterdayRows[0]?.total ?? 0;

  return {
    range: rangeKey,
    totalMessages: {
      value: totalMessages,
      inbound,
      outbound,
      trendPct: trendPct(totalMessages, prevTotal),
    },
    unread: {
      value: unreadAssigned + unreadUnassigned,
      assigned: unreadAssigned,
      unassigned: unreadUnassigned,
      trendPct: 0,
    },
    active: {
      value: activeOpen + activeSnoozed,
      open: activeOpen,
      snoozed: activeSnoozed,
      trendPct: 0,
    },
    resolvedToday: {
      value: resolvedToday,
      resolved: resolvedToday - resolvedEscalated,
      escalated: resolvedEscalated,
      trendPct: trendPct(resolvedToday, resolvedYesterday),
    },
  };
}
