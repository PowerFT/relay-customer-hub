import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { CHANNEL_MIX } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";

export async function GET() {
  await requireCurrentUser();
  // TODO(real-data): SELECT channel, COUNT(*) FROM conversations
  // WHERE status IN ('open','snoozed') GROUP BY channel.
  const total = CHANNEL_MIX.reduce((sum, slice) => sum + slice.value, 0);
  return NextResponse.json({ slices: CHANNEL_MIX, total });
}
