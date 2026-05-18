import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { getLatestActivity } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/activity?limit=6
 *
 * Returns recent agent-relevant events for the Latest Activity card on the
 * dashboard. Shape matches LatestActivityCard's ActivityItem type.
 *
 * TODO(real-data): replace getLatestActivity() with Row 22's UNION query
 * over messages + system rows.
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
  return NextResponse.json({ items: getLatestActivity().slice(0, limit) });
}
