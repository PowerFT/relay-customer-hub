/**
 * Chaos script — sends 50 messages across 3 locations end-to-end and asserts
 * the messages table contains exactly the expected count (no dupes, no drops).
 *
 * Usage:
 *   CHAOS_URL=http://localhost:3000 \
 *   CHAOS_COOKIE='__clerk_session=...' \
 *   pnpm tsx bin/chaos-send.ts
 *
 * The cookie must be a valid signed-in Clerk session — the script POSTs to
 * /api/conversations/:id/messages which goes through the auth middleware.
 *
 * Picks the three most recently connected locations (or all if fewer) and
 * the most-recently-active conversation per location.
 */

import { desc, eq } from "drizzle-orm";

import { db, schema } from "../src/db";

const COUNT = 50;
const LOCATIONS = 3;

async function main() {
  const url = process.env.CHAOS_URL;
  const cookie = process.env.CHAOS_COOKIE;
  if (!url) throw new Error("CHAOS_URL not set");
  if (!cookie) throw new Error("CHAOS_COOKIE not set");

  // Pick the most recent N connected locations
  const locs = await db
    .select({ id: schema.locations.id })
    .from(schema.locations)
    .where(eq(schema.locations.status, "connected"))
    .orderBy(desc(schema.locations.connectedAt))
    .limit(LOCATIONS);
  if (locs.length === 0) {
    throw new Error("No connected locations found");
  }

  // Map each location to its top conversation
  const conversations: { id: string; locationId: string }[] = [];
  for (const loc of locs) {
    const rows = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(eq(schema.conversations.locationId, loc.id))
      .orderBy(desc(schema.conversations.lastMessageAt))
      .limit(1);
    if (rows.length > 0) {
      conversations.push({ id: rows[0].id, locationId: loc.id });
    }
  }
  if (conversations.length === 0) {
    throw new Error("No conversations found on any connected location");
  }

  console.log(`Chaos: ${COUNT} messages across ${conversations.length} conversations`);

  const before = await db
    .select({ id: schema.messages.id })
    .from(schema.messages);
  const beforeCount = before.length;

  // Fire all sends concurrently
  const results = await Promise.allSettled(
    Array.from({ length: COUNT }).map((_, i) => {
      const target = conversations[i % conversations.length];
      return fetch(`${url}/api/conversations/${target.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({ body: `chaos #${i + 1} @ ${Date.now()}` }),
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        return res.json();
      });
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;
  console.log(`Sent: ${succeeded} succeeded, ${failed} failed`);

  // Allow webhooks a moment to land
  await new Promise((r) => setTimeout(r, 5_000));

  const after = await db
    .select({ id: schema.messages.id })
    .from(schema.messages);
  const afterCount = after.length;
  const inserted = afterCount - beforeCount;
  console.log(`Messages table: ${beforeCount} → ${afterCount} (delta ${inserted})`);

  if (inserted !== succeeded) {
    console.error(
      `MISMATCH: ${succeeded} successful sends but ${inserted} new rows. Expected equal counts (each successful send writes exactly one row regardless of webhook order).`,
    );
    process.exit(1);
  }

  console.log("OK — no duplicates, no drops.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
