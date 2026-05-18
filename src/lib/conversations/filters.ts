/**
 * Translate the dashboard's string filter IDs (?agents=sara,tom and
 * ?channels=whatsapp:loc_dubai,...) into Drizzle WHERE clauses against the
 * real DB rows. The seed writes deterministic slugs into:
 *   - users.clerkId         = 'seed_<agentSlug>'
 *   - locations.ghlLocationId = 'seed_<locSlug>'
 * so we can look UUIDs up by those columns.
 */

import { and, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";

import { db, schema } from "@/db";

export type ConversationFilters = {
  agentSlugs: string[] | null;
  /** Each entry is "channel:locationSlug" (e.g. "whatsapp:loc_dubai"). */
  channelKeys: string[] | null;
};

export function parseFiltersFromRequest(url: URL): ConversationFilters {
  const a = url.searchParams.get("agents");
  const c = url.searchParams.get("channels");
  return {
    agentSlugs:
      !a || a === "all" || a.length === 0
        ? null
        : a.split(",").filter(Boolean),
    channelKeys:
      !c || c === "all" || c.length === 0
        ? null
        : c.split(",").filter(Boolean),
  };
}

/**
 * Resolve agent slugs → user UUIDs and (channel, locationSlug) pairs →
 * (channel, locationUuid) pairs. Returns null when there's no filter to
 * apply (so the caller can skip the WHERE clause entirely).
 */
async function resolveSlugs(filters: ConversationFilters) {
  const [agentRows, locRows] = await Promise.all([
    filters.agentSlugs && filters.agentSlugs.length > 0
      ? db
          .select({ id: schema.users.id, clerkId: schema.users.clerkId })
          .from(schema.users)
          .where(
            inArray(
              schema.users.clerkId,
              filters.agentSlugs.map((s) => `seed_${s}`),
            ),
          )
      : Promise.resolve([] as Array<{ id: string; clerkId: string }>),
    filters.channelKeys && filters.channelKeys.length > 0
      ? db
          .select({ id: schema.locations.id, ghlLocationId: schema.locations.ghlLocationId })
          .from(schema.locations)
          .where(
            inArray(
              schema.locations.ghlLocationId,
              [
                ...new Set(
                  filters.channelKeys
                    .map((k) => k.split(":")[1])
                    .filter(Boolean)
                    .map((slug) => `seed_${slug}`),
                ),
              ],
            ),
          )
      : Promise.resolve([] as Array<{ id: string; ghlLocationId: string }>),
  ]);

  const agentIds = agentRows.map((r) => r.id);
  const locBySlug = new Map(
    locRows.map((r) => [r.ghlLocationId.replace(/^seed_/, ""), r.id]),
  );

  // Expand channel keys into (channel, locationUuid) pairs.
  const channelPairs: Array<{ channel: string; locationId: string }> = [];
  if (filters.channelKeys) {
    for (const key of filters.channelKeys) {
      const [channel, locSlug] = key.split(":");
      const locUuid = locSlug ? locBySlug.get(locSlug) : undefined;
      if (channel && locUuid) channelPairs.push({ channel, locationId: locUuid });
    }
  }

  return { agentIds, channelPairs };
}

/**
 * Build the WHERE clauses for the agents + channels filter. Returns an
 * array (possibly empty) that callers concat into their existing where
 * list.
 */
export async function whereForFilters(
  filters: ConversationFilters,
): Promise<SQL[]> {
  if (!filters.agentSlugs && !filters.channelKeys) return [];
  const { agentIds, channelPairs } = await resolveSlugs(filters);
  const clauses: SQL[] = [];

  if (filters.agentSlugs && filters.agentSlugs.length > 0) {
    if (agentIds.length === 0) {
      // User asked for agents that don't exist → return zero rows.
      clauses.push(sql`FALSE`);
    } else {
      clauses.push(inArray(schema.conversations.assigneeId, agentIds));
    }
  }
  if (filters.channelKeys && filters.channelKeys.length > 0) {
    if (channelPairs.length === 0) {
      clauses.push(sql`FALSE`);
    } else {
      const pairClauses = channelPairs.map((p) =>
        and(
          eq(schema.conversations.channel, p.channel),
          eq(schema.conversations.locationId, p.locationId),
        )!,
      );
      const combined = pairClauses.length === 1 ? pairClauses[0] : or(...pairClauses)!;
      clauses.push(combined);
    }
  }
  return clauses;
}

// Silence unused warnings for helpers kept for future use.
void like;
