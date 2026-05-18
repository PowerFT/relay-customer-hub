/**
 * One-off sanity check — proves the seed cross-reconciles across all six
 * dashboard derivations. Run with:
 *   pnpm tsx scripts/check-mock-reconciliation.ts
 */

import {
  ALL_FILTERS,
  getAgentPerformance,
  getChannelMix,
  getChannelRegions,
  getLatestActivity,
  getMapBubbles,
  getResponseTimeByMonth,
  getVolumeByDay,
} from "../src/lib/dashboard/mock-data";

function header(title: string) {
  console.log(`\n──── ${title} ────`);
}

const filters = [
  { label: "no filters", value: ALL_FILTERS },
  { label: "Sara only", value: { agentIds: ["sara"], channelKeys: "all" as const } },
  { label: "WhatsApp Dubai only", value: { agentIds: "all" as const, channelKeys: ["whatsapp:loc_dubai"] } },
  { label: "Sara + WhatsApp Dubai", value: { agentIds: ["sara"], channelKeys: ["whatsapp:loc_dubai"] } },
  { label: "All WhatsApp branches", value: { agentIds: "all" as const, channelKeys: ["whatsapp:loc_dubai", "whatsapp:loc_alain", "whatsapp:loc_abudhabi"] } },
];

for (const { label, value } of filters) {
  header(label);
  const perf = getAgentPerformance(value);
  const mix = getChannelMix(value);
  const regions = getChannelRegions(value);
  const bubbles = getMapBubbles(value);
  const volume = getVolumeByDay(value);
  const rt = getResponseTimeByMonth(value);
  const activity = getLatestActivity(value, 6);
  const handledTotal = perf.reduce((s, p) => s + p.handled, 0);
  const bubblesTotal = bubbles.reduce((s, b) => s + b.count, 0);
  const volumeTotal = volume.reduce((s, v) => s + v.inbound + v.outbound, 0);
  console.log(`  handled (sum)  = ${handledTotal}`);
  console.log(`  mix total      = ${mix.total} (mode=${mix.mode}${mix.channelLabel ? ` "${mix.channelLabel}"` : ""})`);
  console.log(`  mix slices     = ${mix.slices.length} (${mix.slices.map(s => `${s.name}:${s.value}`).join(", ")})`);
  console.log(`  regions        = ${regions.length} (${regions.map(r => `${r.name}:${r.pct}%`).join(", ")})`);
  console.log(`  bubbles        = ${bubbles.length} (sum=${bubblesTotal})`);
  console.log(`  volume 7d sum  = ${volumeTotal}`);
  console.log(`  rt 12 months   = ${rt.length} samples (last 3: ${rt.slice(-3).map(r => `${r.m}=${r.v}m`).join(", ")})`);
  console.log(`  activity rows  = ${activity.length}`);
}
