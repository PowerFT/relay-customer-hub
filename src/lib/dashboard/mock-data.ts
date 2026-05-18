/**
 * Seeded dashboard data — single source of truth.
 *
 * Every chart exported below is derived from one underlying tuples dataset
 * via .filter() reductions, so when the user picks (agents, channel
 * instances) in the dashboard filter bar, all six sections reduce together
 * and the numbers cross-reconcile (Channel Mix total = sum across
 * instances = Volume chart's inbound+outbound for the same range).
 *
 * The seed is deterministic — a tiny LCG keyed on a fixed seed — so demos
 * always look the same. Tuples are generated at module load and reused.
 *
 * Each export carries a // TODO(real-data) marker pointing at the SQL it
 * will be replaced by once HighLevel ingest fills these tables for real.
 */

// ─── Static reference data ────────────────────────────────────────────────

export type LocationRow = {
  id: string;
  displayName: string;
};

// TODO(real-data): SELECT id, COALESCE(display_name, name) FROM locations
// WHERE created_by = $user;
export const LOCATIONS: LocationRow[] = [
  { id: "loc_dubai", displayName: "Dubai branch" },
  { id: "loc_alain", displayName: "Al Ain branch" },
  { id: "loc_abudhabi", displayName: "Abu Dhabi branch" },
  { id: "loc_main", displayName: "Main website" },
];

export type AgentRow = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  /** Static quality score 0-100, displayed in Agent Performance. */
  quality: number;
  /** Static average first-response time, in seconds. */
  avgSeconds: number;
};

// TODO(real-data): SELECT u.id, u.name, u.initials, u.tone FROM users u
// JOIN conversations c ON c.assignee_id = u.id WHERE ...
export const AGENTS: AgentRow[] = [
  { id: "sara", name: "Sara Chen", initials: "SC", tone: "#F8C", quality: 92, avgSeconds: 252 },
  { id: "tom", name: "Tom Patel", initials: "TP", tone: "#9AD", quality: 80, avgSeconds: 348 },
  { id: "maya", name: "Maya Williams", initials: "MW", tone: "#FCD", quality: 76, avgSeconds: 362 },
  { id: "devon", name: "Devon Reyes", initials: "DR", tone: "#CDA", quality: 85, avgSeconds: 291 },
  { id: "priya", name: "Priya Kapoor", initials: "PK", tone: "#FBA", quality: 65, avgSeconds: 494 },
  { id: "alex", name: "Alex Morgan", initials: "AM", tone: "#ACE", quality: 88, avgSeconds: 242 },
];

export type ChannelInstanceRow = {
  /** Stable key "channel:locationId" — used in URL filter param. */
  key: string;
  channel: string;
  locationId: string;
  /** Sub-label after the channel name, e.g. "Dubai branch" or "Brand account". */
  displayName: string;
  /** Brand color (CSS var). */
  color: string;
};

// TODO(real-data): SELECT DISTINCT m.channel, c.location_id, l.display_name
// FROM messages m JOIN conversations c ON c.id = m.conversation_id
// JOIN locations l ON l.id = c.location_id;
export const CHANNEL_INSTANCES: ChannelInstanceRow[] = [
  { key: "whatsapp:loc_dubai", channel: "whatsapp", locationId: "loc_dubai", displayName: "Dubai branch", color: "var(--color-c-whatsapp)" },
  { key: "whatsapp:loc_alain", channel: "whatsapp", locationId: "loc_alain", displayName: "Al Ain branch", color: "var(--color-c-whatsapp)" },
  { key: "whatsapp:loc_abudhabi", channel: "whatsapp", locationId: "loc_abudhabi", displayName: "Abu Dhabi branch", color: "var(--color-c-whatsapp)" },
  { key: "webchat:loc_main", channel: "webchat", locationId: "loc_main", displayName: "Main website", color: "var(--color-c-webchat)" },
  { key: "instagram:loc_main", channel: "instagram", locationId: "loc_main", displayName: "Brand account", color: "var(--color-c-instagram)" },
  { key: "messenger:loc_main", channel: "messenger", locationId: "loc_main", displayName: "Brand account", color: "var(--color-c-messenger)" },
  { key: "email:loc_main", channel: "email", locationId: "loc_main", displayName: "Support inbox", color: "var(--color-c-email)" },
  { key: "sms:loc_main", channel: "sms", locationId: "loc_main", displayName: "Sales line", color: "var(--color-c-sms)" },
];

const INSTANCE_BY_KEY = new Map(CHANNEL_INSTANCES.map((c) => [c.key, c]));
const LOCATION_BY_ID = new Map(LOCATIONS.map((l) => [l.id, l]));

/** World-map position per channel instance (480×260 viewbox). */
const INSTANCE_POSITION: Record<string, { x: number; y: number; country: string }> = {
  "whatsapp:loc_dubai": { x: 320, y: 142, country: "Dubai" },
  "whatsapp:loc_alain": { x: 328, y: 148, country: "Al Ain" },
  "whatsapp:loc_abudhabi": { x: 316, y: 148, country: "Abu Dhabi" },
  "webchat:loc_main": { x: 230, y: 100, country: "Global" },
  "instagram:loc_main": { x: 215, y: 105, country: "Global" },
  "messenger:loc_main": { x: 240, y: 110, country: "Global" },
  "email:loc_main": { x: 200, y: 95, country: "Global" },
  "sms:loc_main": { x: 165, y: 130, country: "Global" },
};

// ─── Per-agent affinity (weights drive sampling) ──────────────────────────

const AGENT_AFFINITY: Record<string, Record<string, number>> = {
  sara: { "whatsapp:loc_dubai": 7, "webchat:loc_main": 3 },
  tom: { "whatsapp:loc_alain": 9, "whatsapp:loc_dubai": 1 },
  maya: { "instagram:loc_main": 5, "messenger:loc_main": 4 },
  devon: { "email:loc_main": 5, "webchat:loc_main": 4 },
  priya: { "sms:loc_main": 5, "whatsapp:loc_abudhabi": 4 },
  alex: {
    "whatsapp:loc_dubai": 1,
    "whatsapp:loc_alain": 1,
    "whatsapp:loc_abudhabi": 1,
    "webchat:loc_main": 1,
    "instagram:loc_main": 1,
    "messenger:loc_main": 1,
    "email:loc_main": 1,
    "sms:loc_main": 1,
  },
};

/** Per-agent total conversation count target (drives the seed shape). */
const AGENT_CONVO_TARGET: Record<string, number> = {
  sara: 48,
  tom: 42,
  maya: 38,
  devon: 34,
  priya: 28,
  alex: 22,
};

// ─── Deterministic PRNG (Mulberry32) ──────────────────────────────────────

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(rand: () => number, weights: Array<[T, number]>): T {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let pick = rand() * total;
  for (const [item, w] of weights) {
    pick -= w;
    if (pick <= 0) return item;
  }
  return weights[weights.length - 1][0];
}

// ─── Conversation + tuple generation ──────────────────────────────────────

type Conversation = {
  id: string;
  agentId: string;
  channel: string;
  locationId: string;
  /** ms epoch the conversation opened. */
  openedAt: number;
  /** Static first-response delay in seconds (used by response-time chart). */
  firstResponseSeconds: number;
};

type MessageTuple = {
  conversationId: string;
  agentId: string;
  channel: string;
  locationId: string;
  ts: number;
  direction: "inbound" | "outbound";
};

const NOW = Date.now();
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function generateAll(): { conversations: Conversation[]; tuples: MessageTuple[] } {
  const rand = mulberry32(20260518);
  const conversations: Conversation[] = [];
  const tuples: MessageTuple[] = [];

  for (const agent of AGENTS) {
    const affinity = AGENT_AFFINITY[agent.id] ?? {};
    const weights: Array<[string, number]> = Object.entries(affinity);
    const target = AGENT_CONVO_TARGET[agent.id] ?? 20;
    // Spread total volume across the full year, but bias toward recent
    // history so the last-7-day window is plausibly populated. 35% of each
    // agent's conversations land within the last 14 days.
    for (let i = 0; i < target; i += 1) {
      const instanceKey = weightedPick(rand, weights);
      const inst = INSTANCE_BY_KEY.get(instanceKey)!;
      const recent = rand() < 0.35;
      const ageMs = recent ? rand() * 14 * DAY_MS : rand() * YEAR_MS;
      const openedAt = NOW - ageMs;
      const convoId = `c_${agent.id}_${i}`;
      // First-response seconds modeled around the agent's avg + ±30% noise.
      const noise = 0.7 + rand() * 0.6;
      const firstResponseSeconds = Math.round(agent.avgSeconds * noise);
      conversations.push({
        id: convoId,
        agentId: agent.id,
        channel: inst.channel,
        locationId: inst.locationId,
        openedAt,
        firstResponseSeconds,
      });
      // 3-8 messages, alternating inbound/outbound, starting with inbound.
      const msgCount = 3 + Math.floor(rand() * 6);
      let cursor = openedAt;
      for (let m = 0; m < msgCount; m += 1) {
        const dir: "inbound" | "outbound" = m % 2 === 0 ? "inbound" : "outbound";
        // First outbound delay = firstResponseSeconds; other gaps random 1-30 min.
        if (m === 1) cursor += firstResponseSeconds * 1000;
        else if (m > 0) cursor += (60 + rand() * 30 * 60) * 1000;
        tuples.push({
          conversationId: convoId,
          agentId: agent.id,
          channel: inst.channel,
          locationId: inst.locationId,
          ts: cursor,
          direction: dir,
        });
      }
    }
  }
  // Sort tuples by time descending so latest-activity is just a slice.
  tuples.sort((a, b) => b.ts - a.ts);
  return { conversations, tuples };
}

const { conversations: CONVERSATIONS, tuples: TUPLES } = generateAll();

// ─── Filters ──────────────────────────────────────────────────────────────

export type DashboardFilters = {
  agentIds: string[] | "all";
  channelKeys: string[] | "all";
};

export const ALL_FILTERS: DashboardFilters = { agentIds: "all", channelKeys: "all" };

/** Parse URL search params ?agents=sara,tom&channels=whatsapp:loc_dubai,... */
export function parseFilters(params: URLSearchParams): DashboardFilters {
  const a = params.get("agents");
  const c = params.get("channels");
  return {
    agentIds: !a || a === "all"
      ? "all"
      : a.split(",").filter((id) => AGENTS.some((x) => x.id === id)),
    channelKeys: !c || c === "all"
      ? "all"
      : c.split(",").filter((k) => INSTANCE_BY_KEY.has(k)),
  };
}

function matchesAgent(f: DashboardFilters, agentId: string): boolean {
  return f.agentIds === "all" || f.agentIds.includes(agentId);
}
function matchesChannel(f: DashboardFilters, channel: string, locationId: string): boolean {
  if (f.channelKeys === "all") return true;
  return f.channelKeys.includes(`${channel}:${locationId}`);
}

function filterTuples(f: DashboardFilters): MessageTuple[] {
  if (f.agentIds === "all" && f.channelKeys === "all") return TUPLES;
  return TUPLES.filter((t) => matchesAgent(f, t.agentId) && matchesChannel(f, t.channel, t.locationId));
}

function filterConversations(f: DashboardFilters): Conversation[] {
  if (f.agentIds === "all" && f.channelKeys === "all") return CONVERSATIONS;
  return CONVERSATIONS.filter(
    (c) => matchesAgent(f, c.agentId) && matchesChannel(f, c.channel, c.locationId),
  );
}

// ─── Derivation: Agent Performance ────────────────────────────────────────

export type AgentPerf = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  handled: number;
  quality: number;
  avg: string;
  /** True when this agent is in the explicit selection — UI highlights it. */
  highlighted: boolean;
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// TODO(real-data): SELECT u.id, u.name, COUNT(DISTINCT c.id) AS handled,
// AVG(... quality scoring ...) AS quality, AVG(first_response_seconds) AS avg
// FROM users u LEFT JOIN conversations c ON c.assignee_id = u.id ...
// WHERE filters... GROUP BY u.id;
export function getAgentPerformance(f: DashboardFilters): AgentPerf[] {
  const convosByAgent = new Map<string, number>();
  for (const c of filterConversations(f)) {
    convosByAgent.set(c.agentId, (convosByAgent.get(c.agentId) ?? 0) + 1);
  }
  const rows = AGENTS.map<AgentPerf>((a) => ({
    id: a.id,
    name: a.name,
    initials: a.initials,
    tone: a.tone,
    handled: convosByAgent.get(a.id) ?? 0,
    quality: a.quality,
    avg: formatSeconds(a.avgSeconds),
    highlighted: f.agentIds !== "all" && f.agentIds.includes(a.id),
  }));
  // Sort: highlighted agents first (preserve relative order by handled desc),
  // then everyone else by handled desc.
  rows.sort((x, y) => {
    if (x.highlighted !== y.highlighted) return x.highlighted ? -1 : 1;
    return y.handled - x.handled;
  });
  return rows;
}

// ─── Derivation: Channel Mix ──────────────────────────────────────────────

export type ChannelMixSlice = {
  id: string;
  name: string;
  color: string;
  value: number;
};

const CHANNEL_META: Record<string, { name: string; color: string }> = {
  whatsapp: { name: "WhatsApp", color: "var(--color-c-whatsapp)" },
  instagram: { name: "Instagram", color: "var(--color-c-instagram)" },
  webchat: { name: "Webchat", color: "var(--color-c-webchat)" },
  messenger: { name: "Messenger", color: "var(--color-c-messenger)" },
  email: { name: "Email", color: "var(--color-c-email)" },
  sms: { name: "SMS", color: "var(--color-c-sms)" },
};

/**
 * Result mode:
 *   - "channel" → slices keyed by channel (default view)
 *   - "branch"  → slices keyed by location (only when exactly one channel
 *                  family is selected, regardless of how many instances of it)
 */
// TODO(real-data): GROUP BY channel (or location_id, in branch mode) over
// conversations with status IN ('open','snoozed'), filtered by selection.
export function getChannelMix(
  f: DashboardFilters,
): { slices: ChannelMixSlice[]; total: number; mode: "channel" | "branch"; channelLabel?: string } {
  const convs = filterConversations(f);
  // Detect "exactly one channel family selected" — branch breakdown mode.
  const selectedChannels =
    f.channelKeys === "all"
      ? new Set<string>()
      : new Set(f.channelKeys.map((k) => INSTANCE_BY_KEY.get(k)?.channel).filter(Boolean) as string[]);

  if (selectedChannels.size === 1) {
    const onlyChannel = [...selectedChannels][0];
    const byLoc = new Map<string, number>();
    for (const c of convs) byLoc.set(c.locationId, (byLoc.get(c.locationId) ?? 0) + 1);
    const meta = CHANNEL_META[onlyChannel] ?? { name: onlyChannel, color: "#9CA3AF" };
    const slices: ChannelMixSlice[] = [...byLoc.entries()]
      .map(([locId, value]) => ({
        id: locId,
        name: LOCATION_BY_ID.get(locId)?.displayName ?? locId,
        color: meta.color,
        value,
      }))
      .sort((a, b) => b.value - a.value);
    return {
      slices,
      total: slices.reduce((s, x) => s + x.value, 0),
      mode: "branch",
      channelLabel: meta.name,
    };
  }

  const byChannel = new Map<string, number>();
  for (const c of convs) byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + 1);
  const slices: ChannelMixSlice[] = [...byChannel.entries()]
    .map(([ch, value]) => ({
      id: ch,
      name: CHANNEL_META[ch]?.name ?? ch,
      color: CHANNEL_META[ch]?.color ?? "#9CA3AF",
      value,
    }))
    .sort((a, b) => b.value - a.value);
  return { slices, total: slices.reduce((s, x) => s + x.value, 0), mode: "channel" };
}

// ─── Derivation: Channel Regions (Top channels by % volume) ───────────────

export type ChannelRegion = {
  id: string;
  name: string;
  color: string;
  pct: number;
};

// TODO(real-data): same as Channel Mix but expressed as % of total messages.
export function getChannelRegions(f: DashboardFilters): ChannelRegion[] {
  const byChannel = new Map<string, number>();
  for (const t of filterTuples(f)) byChannel.set(t.channel, (byChannel.get(t.channel) ?? 0) + 1);
  const total = [...byChannel.values()].reduce((s, x) => s + x, 0);
  if (total === 0) return [];
  return [...byChannel.entries()]
    .map(([ch, count]) => ({
      id: ch,
      name: CHANNEL_META[ch]?.name ?? ch,
      color: CHANNEL_META[ch]?.color ?? "#9CA3AF",
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

// ─── Derivation: World map bubbles ────────────────────────────────────────

export type MapBubble = {
  x: number;
  y: number;
  r: number;
  channel: string;
  country: string;
  count: number;
};

// TODO(real-data): join messages with conversations + locations; group by
// (channel, location); plot at the location's lat/lon (here, fixed offsets).
export function getMapBubbles(f: DashboardFilters): MapBubble[] {
  const byInstance = new Map<string, number>();
  for (const t of filterTuples(f)) {
    const key = `${t.channel}:${t.locationId}`;
    byInstance.set(key, (byInstance.get(key) ?? 0) + 1);
  }
  return [...byInstance.entries()]
    .map(([key, count]) => {
      const inst = INSTANCE_BY_KEY.get(key);
      const pos = INSTANCE_POSITION[key] ?? { x: 240, y: 130, country: "Global" };
      const r = Math.max(8, Math.min(30, 6 + Math.sqrt(count) * 1.6));
      return {
        x: pos.x,
        y: pos.y,
        r,
        channel: inst?.channel ?? key.split(":")[0],
        country: pos.country,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Derivation: Volume by day (last 7 days) ──────────────────────────────

export type VolumeDatum = { day: string; inbound: number; outbound: number };

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// TODO(real-data): GROUP BY date_trunc('day', sent_at), direction
// WHERE sent_at >= now() - interval '7 days' AND filters apply.
export function getVolumeByDay(f: DashboardFilters): VolumeDatum[] {
  const cutoff = NOW - 7 * DAY_MS;
  const byDay = new Map<number, { inbound: number; outbound: number }>();
  // Initialize all 7 day-of-week buckets so the chart renders even when
  // some days have zero volume after filtering.
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(NOW - i * DAY_MS);
    byDay.set(d.getDay(), { inbound: 0, outbound: 0 });
  }
  for (const t of filterTuples(f)) {
    if (t.ts < cutoff) continue;
    const dow = new Date(t.ts).getDay();
    const slot = byDay.get(dow);
    if (slot) slot[t.direction] += 1;
  }
  // Return in chronological order (oldest day → today).
  const result: VolumeDatum[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dow = new Date(NOW - i * DAY_MS).getDay();
    const slot = byDay.get(dow) ?? { inbound: 0, outbound: 0 };
    result.push({ day: DAY_LABEL[dow], ...slot });
  }
  return result;
}

// ─── Derivation: Response time by month ───────────────────────────────────

export type ResponseTimeDatum = { m: string; v: number };

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// TODO(real-data): PERCENTILE_CONT(0.5) WITHIN GROUP (
//   ORDER BY first_outbound - first_inbound
// ) per month, with the same filter join.
export function getResponseTimeByMonth(f: DashboardFilters): ResponseTimeDatum[] {
  // Bucket conversations by (year, month).
  const buckets = new Map<string, number[]>();
  for (const c of filterConversations(f)) {
    const d = new Date(c.openedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c.firstResponseSeconds);
  }
  // Walk the last 12 months in order so the x-axis always has 12 ticks.
  const result: ResponseTimeDatum[] = [];
  const ref = new Date(NOW);
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const samples = buckets.get(key) ?? [];
    let median = 0;
    if (samples.length > 0) {
      const sorted = [...samples].sort((a, b) => a - b);
      median = sorted[Math.floor(sorted.length / 2)];
    }
    result.push({ m: MONTH_LABEL[d.getMonth()], v: +(median / 60).toFixed(2) });
  }
  return result;
}

// ─── Derivation: Latest Activity ──────────────────────────────────────────

export type ActivityItem = {
  id: string;
  type: "inbound" | "resolved" | "assigned" | "system";
  title: string;
  subtitle: string | null;
  channel: string;
  conversationId: string;
  createdAt: string;
};

const FAKE_CONTACTS = [
  "Maria Lopez",
  "Chris Bauer",
  "Hannah Reilly",
  "Yuki Tanaka",
  "Marcus Hale",
  "Priya Patel",
  "Diego Reyes",
  "Aisha Khan",
  "Ben Cohen",
  "Noor Hassan",
  "Jordan Lee",
  "Sofia Costa",
];

const SUBJECTS_BY_CHANNEL: Record<string, string[]> = {
  whatsapp: ["Order #4521 — needs refund info", "Booking confirmation?", "Spare key replacement"],
  instagram: ['"Where can I order this in EU?"', '"Is this still in stock?"', "Story reply"],
  webchat: ["Discount code WELCOME15 invalid", "Pricing question on Pro plan", "Trial extension request"],
  messenger: ["Reply to story", "Asked about return window", "Issue marked as resolved by Maya"],
  email: ["Re: Invoice #INV-2024-0931", "Re: Order shipped", "Re: Subscription renewal"],
  sms: ["Confirm appointment", "Quote request", "Promo code"],
};

const CHANNEL_TITLE_PREFIX: Record<string, string> = {
  whatsapp: "New WhatsApp from",
  instagram: "New comment from",
  webchat: "Live chat from",
  messenger: "Messenger reply from",
  email: "Email from",
  sms: "SMS from",
};

// TODO(real-data): Row 22's CTE over messages + system rows, restored here
// once real ingest fills the tables.
export function getLatestActivity(f: DashboardFilters, limit = 6): ActivityItem[] {
  const inbound = filterTuples(f).filter((t) => t.direction === "inbound");
  // tuples are already sorted desc by ts.
  const out: ActivityItem[] = [];
  for (let i = 0; i < inbound.length && out.length < limit; i += 1) {
    const t = inbound[i];
    // Stable pseudo-random pick keyed off (conversationId + index) so titles
    // don't shuffle on re-render.
    const key = (hash(t.conversationId) + i) >>> 0;
    const name = FAKE_CONTACTS[key % FAKE_CONTACTS.length];
    const subs = SUBJECTS_BY_CHANNEL[t.channel] ?? ["—"];
    const subtitle = subs[key % subs.length];
    out.push({
      id: `${t.conversationId}-${i}`,
      type: "inbound",
      title: `${CHANNEL_TITLE_PREFIX[t.channel] ?? "New message from"} ${name}`,
      subtitle,
      channel: t.channel,
      conversationId: t.conversationId,
      createdAt: new Date(t.ts).toISOString(),
    });
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
