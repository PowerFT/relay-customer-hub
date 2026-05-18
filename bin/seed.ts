/**
 * CLI entry-point for the demo seed. Delegates all work to
 * src/lib/seed/demo.ts so the same code path runs from the one-shot
 * /api/admin/seed route.
 *
 * Usage:
 *   pnpm db:seed              # idempotent — wipes seeded rows by slug prefix
 *   pnpm db:seed -- --reset   # hard TRUNCATE (incl. real rows)
 */

import { runDemoSeed } from "../src/lib/seed/demo";

async function main() {
  const args = process.argv.slice(2);
  const hardReset = args.includes("--reset");
  const result = await runDemoSeed({ hardReset });
  console.log(
    `+ owner=${result.ownerName}, agents=${result.agents}, locations=${result.locations}`,
  );
  console.log(
    `+ contacts=${result.contacts}, conversations=${JSON.stringify(result.conversations)}, messages=${result.messages}, notes=${result.notes}`,
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
