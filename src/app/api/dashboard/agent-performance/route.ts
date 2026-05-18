import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getAgentPerformance } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCurrentUser();
  // TODO(real-data): SELECT u.id, u.name, COUNT(DISTINCT c.id) AS handled,
  // median first-response per agent, with the same agent/channel filters.
  return NextResponse.json({ agents: getAgentPerformance(readFilters(req)) });
}
