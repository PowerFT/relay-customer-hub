/**
 * Seeded dashboard data — placeholders for §4.3 and §4.4 of design.md.
 *
 * Everything in this file is the shape the API routes return verbatim.
 * When the DB has enough inbound message volume to compute these for
 * real, swap the seed export's body for a SQL query — the route + the
 * component contract stays the same.
 *
 * Shapes match reference/mock-data.js (the prototype) so the visual
 * fidelity check holds.
 */

export type MapBubble = {
  x: number;
  y: number;
  r: number;
  channel: string;
  country: string;
  count: number;
};

// TODO(real-data): pivot conversations.location.country (once captured)
// against messages grouped by channel; produce bubble per (country, channel).
export const MAP_BUBBLES: MapBubble[] = [
  { x: 245, y: 110, r: 22, channel: "whatsapp", country: "Spain", count: 184 },
  { x: 195, y: 95, r: 18, channel: "webchat", country: "UK", count: 142 },
  { x: 230, y: 100, r: 14, channel: "instagram", country: "France", count: 96 },
  { x: 145, y: 130, r: 26, channel: "whatsapp", country: "USA", count: 312 },
  { x: 165, y: 165, r: 16, channel: "messenger", country: "Mexico", count: 102 },
  { x: 215, y: 220, r: 20, channel: "whatsapp", country: "Brazil", count: 228 },
  { x: 285, y: 180, r: 12, channel: "instagram", country: "Nigeria", count: 64 },
  { x: 325, y: 145, r: 14, channel: "webchat", country: "India", count: 88 },
  { x: 380, y: 165, r: 11, channel: "messenger", country: "Indonesia", count: 52 },
  { x: 360, y: 110, r: 13, channel: "whatsapp", country: "China", count: 74 },
  { x: 400, y: 230, r: 10, channel: "webchat", country: "Australia", count: 44 },
];

export type ChannelRegion = {
  id: string;
  name: string;
  color: string;
  pct: number;
};

// TODO(real-data): SELECT channel, COUNT(*) FROM messages JOIN conversations
// JOIN locations WHERE created_by=$user; compute % of total.
export const CHANNEL_REGIONS: ChannelRegion[] = [
  { id: "whatsapp", name: "WhatsApp", color: "var(--color-c-whatsapp)", pct: 52 },
  { id: "instagram", name: "Instagram", color: "var(--color-c-instagram)", pct: 23 },
  { id: "webchat", name: "Webchat", color: "var(--color-c-webchat)", pct: 14 },
  { id: "messenger", name: "Messenger", color: "var(--color-c-messenger)", pct: 8 },
  { id: "other", name: "Other", color: "#9CA3AF", pct: 3 },
];

export type AgentPerf = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  /** Conversations handled this period. */
  handled: number;
  /** Quality score 0-100. */
  quality: number;
  /** Pre-formatted avg response time, e.g. "4m 12s". */
  avg: string;
};

// TODO(real-data): join users with conversations COUNT() per assignee +
// median (first outbound - first inbound) per conversation in range.
export const AGENT_PERFORMANCE: AgentPerf[] = [
  { id: "sara", name: "Sara Chen", initials: "SC", tone: "#F8C", handled: 48, quality: 92, avg: "4m 12s" },
  { id: "tom", name: "Tom Patel", initials: "TP", tone: "#9AD", handled: 42, quality: 80, avg: "5m 48s" },
  { id: "maya", name: "Maya Williams", initials: "MW", tone: "#FCD", handled: 38, quality: 76, avg: "6m 02s" },
  { id: "devon", name: "Devon Reyes", initials: "DR", tone: "#CDA", handled: 34, quality: 85, avg: "4m 51s" },
  { id: "priya", name: "Priya Kapoor", initials: "PK", tone: "#FBA", handled: 28, quality: 65, avg: "8m 14s" },
  { id: "me", name: "Alex Morgan", initials: "AM", tone: "#ACE", handled: 22, quality: 88, avg: "4m 02s" },
];

export type ChannelMixSlice = {
  id: string;
  name: string;
  color: string;
  value: number;
};

// TODO(real-data): SELECT channel, COUNT(*) FROM conversations
// WHERE status IN ('open','snoozed') GROUP BY channel.
// Sum of these values is the donut center number.
export const CHANNEL_MIX: ChannelMixSlice[] = [
  { id: "whatsapp", name: "WhatsApp", color: "var(--color-c-whatsapp)", value: 98 },
  { id: "instagram", name: "Instagram", color: "var(--color-c-instagram)", value: 43 },
  { id: "webchat", name: "Webchat", color: "var(--color-c-webchat)", value: 26 },
  { id: "messenger", name: "Messenger", color: "var(--color-c-messenger)", value: 15 },
  { id: "email", name: "Email", color: "var(--color-c-email)", value: 4 },
];

export type ActivityItem = {
  id: string;
  type: "inbound" | "resolved" | "assigned" | "system";
  title: string;
  subtitle: string | null;
  channel: string;
  conversationId: string;
  /** ISO timestamp; consumer formats with formatDistanceToNowStrict. */
  createdAt: string;
};

// TODO(real-data): replace with Row 22's UNION query over messages + system
// rows. Shape here mirrors the component contract in latest-activity-card.tsx.
// Computed at request time so relative-time labels stay fresh.
export function getLatestActivity(): ActivityItem[] {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  return [
    {
      id: "demo-1",
      type: "inbound",
      channel: "whatsapp",
      title: "New WhatsApp from Maria Lopez",
      subtitle: "Order #4521 — needs refund info",
      createdAt: ago(30 * 1000), // 30s → "30s"
      conversationId: "demo-maria-lopez",
    },
    {
      id: "demo-2",
      type: "inbound",
      channel: "instagram",
      title: "New comment on @yourbrand",
      subtitle: '"Where can I order this in EU?"',
      createdAt: ago(6 * 60 * 1000), // 6m
      conversationId: "demo-yourbrand-comment",
    },
    {
      id: "demo-3",
      type: "inbound",
      channel: "webchat",
      title: "Live chat from Chris Bauer",
      subtitle: "Discount code WELCOME15 invalid",
      createdAt: ago(12 * 60 * 1000), // 12m
      conversationId: "demo-chris-bauer",
    },
    {
      id: "demo-4",
      type: "inbound",
      channel: "email",
      title: "Email from Hannah Reilly",
      subtitle: "Re: Invoice #INV-2024-0931",
      createdAt: ago(60 * 60 * 1000), // 1h
      conversationId: "demo-hannah-reilly",
    },
    {
      id: "demo-5",
      type: "resolved",
      channel: "messenger",
      title: "Yuki Tanaka resolved",
      subtitle: "Issue marked as resolved by Maya",
      createdAt: ago(34 * 60 * 1000), // 34m
      conversationId: "demo-yuki-tanaka",
    },
    {
      id: "demo-6",
      type: "inbound",
      channel: "linkedin",
      title: "Marcus Hale message",
      subtitle: "Interested in Enterprise plan",
      createdAt: ago(26 * 60 * 60 * 1000), // ~1 day
      conversationId: "demo-marcus-hale",
    },
  ];
}
