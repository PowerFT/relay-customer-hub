/**
 * Demo-seed runner. Shared between the CLI (`pnpm db:seed`) and the
 * one-shot admin route at /api/admin/seed.
 *
 * Idempotent: by default deletes prior seeded rows (matched by deterministic
 * slug prefix on users.clerk_id and locations.ghl_location_id) and re-inserts.
 * Pass { hardReset: true } to TRUNCATE everything (incl. real rows).
 *
 * Owner detection: uses the first row in `users`. If the table is empty the
 * function throws — sign in to the app once first so the Clerk webhook
 * seeds your row.
 */

import { asc, isNull, not, or, sql, like } from "drizzle-orm";

import { db, schema } from "@/db";

const AGENTS = [
  { slug: "sara", name: "Sara Chen", email: "sara@example.com", initials: "SC", tone: "#F8C" },
  { slug: "tom", name: "Tom Patel", email: "tom@example.com", initials: "TP", tone: "#9AD" },
  { slug: "maya", name: "Maya Williams", email: "maya@example.com", initials: "MW", tone: "#FCD" },
  { slug: "devon", name: "Devon Reyes", email: "devon@example.com", initials: "DR", tone: "#CDA" },
  { slug: "priya", name: "Priya Kapoor", email: "priya@example.com", initials: "PK", tone: "#FBA" },
  { slug: "alex", name: "Alex Morgan", email: "alex@example.com", initials: "AM", tone: "#ACE" },
] as const;

const LOCATIONS = [
  { slug: "loc_dubai", name: "Acme — Dubai", displayName: "Dubai branch", phone: "+971501110000" },
  { slug: "loc_alain", name: "Acme — Al Ain", displayName: "Al Ain branch", phone: "+971501110001" },
  { slug: "loc_abudhabi", name: "Acme — Abu Dhabi", displayName: "Abu Dhabi branch", phone: "+971501110002" },
  { slug: "loc_main", name: "Acme — Main", displayName: "Main website", phone: "+14155550199" },
] as const;

type AgentSlug = (typeof AGENTS)[number]["slug"];
type LocSlug = (typeof LOCATIONS)[number]["slug"];

const AFFINITY: Array<{ agent: AgentSlug; channel: string; loc: LocSlug; w: number }> = [
  { agent: "sara", channel: "whatsapp", loc: "loc_dubai", w: 6 },
  { agent: "sara", channel: "webchat", loc: "loc_main", w: 3 },
  { agent: "tom", channel: "whatsapp", loc: "loc_alain", w: 7 },
  { agent: "maya", channel: "instagram", loc: "loc_main", w: 4 },
  { agent: "maya", channel: "messenger", loc: "loc_main", w: 3 },
  { agent: "devon", channel: "email", loc: "loc_main", w: 4 },
  { agent: "devon", channel: "webchat", loc: "loc_main", w: 2 },
  { agent: "priya", channel: "sms", loc: "loc_main", w: 3 },
  { agent: "priya", channel: "whatsapp", loc: "loc_abudhabi", w: 3 },
  { agent: "alex", channel: "whatsapp", loc: "loc_dubai", w: 1 },
  { agent: "alex", channel: "instagram", loc: "loc_main", w: 1 },
  { agent: "alex", channel: "email", loc: "loc_main", w: 1 },
];

const CHANNEL_TONES: Record<string, string> = {
  whatsapp: "#A7CAF0",
  webchat: "#F4C9D2",
  instagram: "#FCD",
  messenger: "#C9F0DA",
  email: "#F5E4A8",
  sms: "#D1C4E9",
};

const FIRST_NAMES = ["Maria", "Tom", "Sara", "Alex", "Priya", "Diego", "Anna", "Wei", "Liam", "Noor", "James", "Olivia", "Kenji", "Fatima", "Sofia"];
const LAST_NAMES = ["Lopez", "Patel", "Chen", "Müller", "Garcia", "Kim", "Singh", "Rossi", "Hassan", "Yamada", "Andersson", "Costa", "Tanaka"];

const SAMPLE_INBOUND = [
  "Hi, is this still in stock?",
  "When will my order arrive?",
  "Thanks for the quick reply!",
  "Can you send me the receipt again?",
  "I'd like to schedule a call",
  "The package arrived damaged — what now?",
  "Just placed order #4521",
  "Could you update my address?",
  "Will you have the new sizes next week?",
];
const SAMPLE_OUTBOUND = [
  "Sure — let me check on that.",
  "Yes, we still have it.",
  "Apologies for the delay, looking into it now.",
  "Just sent — let me know if anything's missing.",
  "Confirmed for 3pm Friday.",
  "Sorry to hear that — I'll start a refund right away.",
  "Order is out for delivery, should be there today.",
];

const PRIORITIES = ["normal", "normal", "normal", "high"] as const;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type SeedOptions = {
  hardReset?: boolean;
  /** Deterministic PRNG seed — change for a different random spread. */
  prngSeed?: number;
};

export type SeedResult = {
  ownerName: string;
  agents: number;
  locations: number;
  conversations: { open: number; snoozed: number; closed: number };
  contacts: number;
  messages: number;
  notes: number;
};

export async function runDemoSeed(opts: SeedOptions = {}): Promise<SeedResult> {
  const rand = mulberry32(opts.prngSeed ?? 20260518);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const randomDigits = (n: number): string => {
    let out = "";
    for (let i = 0; i < n; i += 1) out += Math.floor(rand() * 10);
    return out;
  };
  const weightedPick = <T,>(weights: Array<[T, number]>): T => {
    const total = weights.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [item, w] of weights) {
      r -= w;
      if (r <= 0) return item;
    }
    return weights[weights.length - 1][0];
  };

  // Owner detection — only used for the friendly ownerName in the seed
  // response. Seeded locations themselves are created with createdBy=NULL
  // (demo data, visible to every signed-in user via the locationOwnedByOrDemo
  // helper in /lib/scope.ts), so the owner row isn't load-bearing.
  const ownerRows = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(or(isNull(schema.users.clerkId), not(like(schema.users.clerkId, "seed_%"))))
    .orderBy(asc(schema.users.createdAt))
    .limit(1);
  if (ownerRows.length === 0) {
    throw new Error("users table has no real users — sign in to the app once first so the Clerk webhook seeds your row.");
  }
  const owner = ownerRows[0];

  // Self-heal: ensure the schema columns this seed writes actually exist.
  // displayName was added after the initial schema; until `pnpm db:push`
  // is run, the live DB may lack it.
  await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS display_name text`);

  if (opts.hardReset) {
    await db.execute(sql`TRUNCATE notes, messages, webhook_events, conversations, contacts, locations RESTART IDENTITY CASCADE`);
    await db.execute(sql`DELETE FROM users WHERE clerk_id LIKE 'seed_%'`);
  } else {
    // Idempotent re-seed: wipe all rows whose deterministic slug prefix
    // we own. Broaden to 'seed_%' so previous seed runs (with random
    // suffixes like 'seed_<digits>') also get cleaned up. Schema cascades
    // from locations → conversations → messages/notes and locations →
    // contacts → conversations, so deleting locations clears everything
    // below. assignee_id / author_id on conversations/messages/notes
    // reference users.id without cascade, so users must be deleted AFTER
    // locations, once nothing references them.
    await db.execute(sql`DELETE FROM locations WHERE ghl_location_id LIKE 'seed_%'`);
    await db.execute(sql`DELETE FROM users WHERE clerk_id LIKE 'seed_%'`);
  }

  const teammatesById: Record<AgentSlug, string> = {} as Record<AgentSlug, string>;
  for (const a of AGENTS) {
    const [row] = await db
      .insert(schema.users)
      .values({
        clerkId: `seed_${a.slug}`,
        email: a.email,
        name: a.name,
        initials: a.initials,
        tone: a.tone,
        role: "agent",
      })
      .returning({ id: schema.users.id });
    teammatesById[a.slug] = row.id;
  }

  const locationsById: Record<LocSlug, string> = {} as Record<LocSlug, string>;
  for (const l of LOCATIONS) {
    const [row] = await db
      .insert(schema.locations)
      .values({
        ghlLocationId: `seed_${l.slug}`,
        name: l.name,
        displayName: l.displayName,
        whatsappNumber: l.phone,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        // createdBy = NULL marks this as demo data: /api/conversations and
        // /api/channel-counts treat null-owner locations as visible to any
        // authenticated user, so every Clerk account sees the same seeded
        // fixtures without needing to be re-assigned per signup.
        createdBy: null,
        status: "connected",
      })
      .returning({ id: schema.locations.id });
    locationsById[l.slug] = row.id;
  }

  const affinityWeights = AFFINITY.map<[typeof AFFINITY[number], number]>((a) => [a, a.w]);
  let contactCount = 0;
  const convoCount = { open: 0, snoozed: 0, closed: 0 };
  let msgCount = 0;
  let noteCount = 0;

  async function spawnConversation(status: "open" | "snoozed" | "closed") {
    const a = weightedPick(affinityWeights);
    const agentId = teammatesById[a.agent];
    const locationId = locationsById[a.loc];
    const channel = a.channel;
    const priority = pick(PRIORITIES);

    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const [contact] = await db
      .insert(schema.contacts)
      .values({
        locationId,
        ghlContactId: `seed_${randomDigits(20)}`,
        name,
        phone: `+1415555${randomDigits(4)}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        tone: CHANNEL_TONES[channel] ?? "#DDE2EC",
        customFields: {
          customerSince: "Apr 2024",
          lifetimeValue: `$${Math.floor(50 + rand() * 2000)}`,
          totalOrders: `${1 + Math.floor(rand() * 12)}`,
          lastOrder: `${1 + Math.floor(rand() * 30)} days ago`,
        },
      })
      .returning({ id: schema.contacts.id });
    contactCount += 1;

    const minutesOld = Math.floor(rand() * 60 * 24 * 5);
    const lastMsgAt = new Date(Date.now() - minutesOld * 60_000);
    const lastInbound = new Date(lastMsgAt.getTime() - rand() * 30 * 60_000);
    const unread = status === "open" ? Math.floor(rand() * 4) : 0;

    const [conv] = await db
      .insert(schema.conversations)
      .values({
        locationId,
        ghlConversationId: `seed_${randomDigits(20)}`,
        contactId: contact.id,
        channel,
        status,
        priority,
        assigneeId: agentId,
        lastMessageAt: lastMsgAt,
        lastInboundAt: lastInbound,
        unreadCount: unread,
      })
      .returning({ id: schema.conversations.id });
    convoCount[status] += 1;

    const msgCountForConv = 3 + Math.floor(rand() * 6);
    let cursorTime = new Date(lastMsgAt.getTime() - msgCountForConv * 5 * 60_000);
    for (let m = 0; m < msgCountForConv; m += 1) {
      cursorTime = new Date(cursorTime.getTime() + (3 + rand() * 7) * 60_000);
      const isOut = m > 0 && m % 2 === 1;
      await db.insert(schema.messages).values({
        conversationId: conv.id,
        ghlMessageId: `seed_${randomDigits(20)}`,
        direction: isOut ? "outbound" : "inbound",
        authorId: isOut ? agentId : null,
        body: isOut ? pick(SAMPLE_OUTBOUND) : pick(SAMPLE_INBOUND),
        sentAt: cursorTime,
        status: "sent",
        deliveredAt: isOut ? cursorTime : null,
      });
      msgCount += 1;
    }
    if (rand() < 0.3) {
      await db.insert(schema.notes).values({
        conversationId: conv.id,
        authorId: agentId,
        body: `Customer mentioned a referral from @${pick(AGENTS).name.split(" ")[0]} — worth following up.`,
      });
      noteCount += 1;
    }
  }

  for (let i = 0; i < 20; i += 1) await spawnConversation("open");
  for (let i = 0; i < 4; i += 1) await spawnConversation("snoozed");
  for (let i = 0; i < 8; i += 1) await spawnConversation("closed");

  return {
    ownerName: owner.name ?? owner.email ?? owner.id,
    agents: AGENTS.length,
    locations: LOCATIONS.length,
    conversations: convoCount,
    contacts: contactCount,
    messages: msgCount,
    notes: noteCount,
  };
}
