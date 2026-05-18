import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { readFilters } from "@/lib/dashboard/filters";
import { getChannelMix } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCurrentUser();
  // TODO(real-data): GROUP BY channel (or location_id, in branch mode)
  // over conversations where status IN ('open','snoozed') AND filters apply.
  // Branch mode triggers when exactly one channel family is selected.
  return NextResponse.json(getChannelMix(readFilters(req)));
}
