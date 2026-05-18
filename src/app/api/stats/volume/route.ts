import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getVolumeByDay } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TODO(real-data): GROUP BY date_trunc('day', sent_at), direction over
// messages JOIN conversations WHERE sent_at >= now() - interval '7 days'
// AND filters apply (assignee_id IN agents, (channel, location_id) IN
// channel_keys). The DB-backed version that lived here before is in git
// history if you need to reference it.
export async function GET(req: Request) {
  await requireCurrentUser();
  return NextResponse.json({ data: getVolumeByDay(readFilters(req)) });
}
