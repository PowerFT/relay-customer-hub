/**
 * Tiny helper used by every /api/dashboard/* + /api/stats/* + /api/activity
 * route to turn the dashboard's URL search params into a DashboardFilters
 * object that mock-data.ts derivations consume directly.
 *
 * Wire format:
 *   ?agents=sara,tom            (or "all" / omitted = all)
 *   ?channels=whatsapp:loc_dubai,webchat:loc_main   (or "all" / omitted)
 */

import { parseFilters, type DashboardFilters } from "@/lib/dashboard/mock-data";

export type { DashboardFilters };

export function readFilters(req: Request): DashboardFilters {
  const url = new URL(req.url);
  return parseFilters(url.searchParams);
}
