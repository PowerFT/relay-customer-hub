import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getChannelRegions } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCurrentUser();
  // TODO(real-data): SELECT channel, COUNT(*)*100.0/total AS pct GROUP BY channel,
  // with the same agent/channel filters.
  return NextResponse.json({ regions: getChannelRegions(readFilters(req)) });
}
