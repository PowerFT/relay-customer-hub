import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { MAP_BUBBLES } from "@/lib/dashboard/mock-data";

export const runtime = "nodejs";

export async function GET() {
  await requireCurrentUser();
  // TODO(real-data): aggregate by (country, channel) once we capture country.
  return NextResponse.json({ bubbles: MAP_BUBBLES });
}
