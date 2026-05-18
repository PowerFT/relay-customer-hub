import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getLatestActivity } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/activity?limit=6&agents=sara,tom&channels=whatsapp:loc_dubai,...
 *
 * Returns recent agent-relevant events for the Latest Activity card.
 * Filters reduce the seed via mock-data getLatestActivity().
 *
 * TODO(real-data): replace getLatestActivity() with Row 22's UNION query
 * over messages + system rows, applying the same agent/channel filters.
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
  const filters = readFilters(req);
  return NextResponse.json({ items: getLatestActivity(filters, limit) });
}
