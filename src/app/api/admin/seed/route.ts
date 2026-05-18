import { NextResponse } from "next/server";

import { runDemoSeed } from "@/lib/seed/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-shot admin endpoint for running the demo seed against the live DB.
 *
 *   POST /api/admin/seed                 # idempotent (slug-prefix wipe + reinsert)
 *   POST /api/admin/seed?reset=1         # TRUNCATE everything first
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Useful when local dev doesn't have DATABASE_URL but you can hit prod.
 * Same protection as /api/cron/unsnooze.
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const hardReset = url.searchParams.get("reset") === "1";

  try {
    const result = await runDemoSeed({ hardReset });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
