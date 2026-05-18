/**
 * Replay a stored GHL webhook by externalId.
 *
 * Usage:
 *   pnpm tsx bin/ghl-replay.ts <externalId>
 *
 * Looks up webhook_events.payload, re-POSTs to /api/webhooks/ghl on the
 * URL in WEBHOOK_REPLAY_URL (defaults to http://localhost:3000). Generates
 * a valid x-wh-signature using GHL_WEBHOOK_SECRET so the handler accepts
 * the replay end-to-end.
 *
 * Doesn't reset processedAt — the in-flight handler will see the event as
 * already-processed and bail at the dedup step. Pass --reset to clear the
 * webhook_events row first.
 */

import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";

import { db, schema } from "../src/db";

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const externalId = args.find((a) => !a.startsWith("--"));
  if (!externalId) {
    console.error("Usage: pnpm tsx bin/ghl-replay.ts <externalId> [--reset]");
    process.exit(1);
  }

  const event = await db.query.webhookEvents.findFirst({
    where: eq(schema.webhookEvents.externalId, externalId),
  });
  if (!event) {
    console.error(`No webhook_events row with externalId=${externalId}`);
    process.exit(1);
  }

  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GHL_WEBHOOK_SECRET not set");
    process.exit(1);
  }

  if (reset) {
    await db
      .delete(schema.webhookEvents)
      .where(eq(schema.webhookEvents.id, event.id));
    console.log(`Deleted webhook_events row ${event.id} — handler will reprocess.`);
  }

  const body = JSON.stringify(event.payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const url = (process.env.WEBHOOK_REPLAY_URL ?? "http://localhost:3000") + "/api/webhooks/ghl";

  console.log(`Replaying ${externalId} → ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wh-signature": signature,
    },
    body,
  });
  const text = await res.text();
  console.log(`HTTP ${res.status}: ${text}`);
  process.exit(res.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
