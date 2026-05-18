import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { CHANNEL_REGIONS } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";

export async function GET() {
  await requireCurrentUser();
  // TODO(real-data): SELECT channel, COUNT(*)*100.0/total AS pct GROUP BY channel.
  return NextResponse.json({ regions: CHANNEL_REGIONS });
}
