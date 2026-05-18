import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getResponseTimeByMonth } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TODO(real-data): PERCENTILE_CONT(0.5) WITHIN GROUP (
//   ORDER BY first_outbound.sent_at - first_inbound.sent_at
// ) per month, with the same agent/channel filter join. The DB-backed
// version that lived here before is in git history.
export async function GET(req: Request) {
  await requireCurrentUser();
  return NextResponse.json({ data: getResponseTimeByMonth(readFilters(req)) });
}
