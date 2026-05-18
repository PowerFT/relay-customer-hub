import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getMapBubbles } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCurrentUser();
  // TODO(real-data): group messages by (channel, location_id), plot at the
  // location's lat/lon. Filters apply via WHERE on assignee/channel.
  return NextResponse.json({ bubbles: getMapBubbles(readFilters(req)) });
}
