import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { fetchStats } from "@/lib/dashboard/stats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireCurrentUser();
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "7d";
  const locationId = url.searchParams.get("locationId") ?? "all";
  const stats = await fetchStats({ range, locationId });
  return NextResponse.json(stats);
}
