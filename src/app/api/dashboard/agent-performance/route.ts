import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { AGENT_PERFORMANCE } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";

export async function GET() {
  await requireCurrentUser();
  // TODO(real-data): join users + conversations for handled count +
  // median first-response per agent.
  return NextResponse.json({ agents: AGENT_PERFORMANCE });
}
