import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { LATEST_ACTIVITY } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";

/**
 * GET /api/activity?limit=6
 *
 * Returns recent agent-relevant events for the Latest Activity card on the
 * dashboard. Shape matches the prototype: { channel, title, sub, time,
 * conversationId }.
 *
 * TODO(real-data): Row 22 had a CTE over messages + system rows producing
 * the same shape (with different keys). Restore that query here, renaming
 * subtitle→sub and createdAt→time (formatted relative).
 */

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

export async function GET(req: Request) {
  await requireCurrentUser();
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  return NextResponse.json({ items: LATEST_ACTIVITY.slice(0, limit) });
}
