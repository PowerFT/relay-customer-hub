/**
 * Seed dummy data so the dashboard and conversations UI have something to show
 * before the first real HighLevel message arrives.
 *
 * Usage:
 *   pnpm db:seed                # additive — adds a fresh batch each run
 *   pnpm db:seed -- --reset     # truncates the demo tables first
 *
 * Identifies the owner via the first row in `users` (which the Clerk webhook
 * populates on first sign-in). If `users` is empty, aborts with a hint.
 */

import { sql } from "drizzle-orm";

import { db, schema } from "../src/db";

const args = process.argv.slice(2);
const RESET = args.includes("--reset");

const CHANNELS = ["whatsapp", "messenger", "instagram", "webchat", "email"] as const;
const STATUSES = ["open", "open", "open", "open", "snoozed", "closed"] as const; // bias towards open
const PRIORITIES = ["normal", "normal", "normal", "high"] as const;
const TONES = ["#A7CAF0", "#F4C9D2", "#C9F0DA", "#F5E4A8", "#D1C4E9", "#FFB5A7"];

const FIRST_NAMES = [
  "Maria", "Tom", "Sara", "Alex", "Priya", "Diego", "Anna", "Wei",
  "Liam", "Noor", "James", "Olivia", "Kenji", "Fatima", "Sofia",
];
const LAST_NAMES = [
  "Lopez", "Patel", "Chen", "Müller", "Garcia", "Kim", "Singh",
  "Rossi", "Hassan", "Yamada", "Andersson", "Costa", "Tanaka",
];

const SAMPLE_MESSAGES = [
  "Hi, is this still in stock?",
  "When will my order arrive?",
  "Thanks for the quick reply!",
  "Can you send me the receipt again?",
  "I'd like to schedule a call",
  "The package arrived damaged — what now?",
  "Just placed order #4521",
  "Could you update my address?",
  "Will you have the new sizes next week?",
  "Following up on yesterday",
  "Got it, thanks 👍",
  "What's the warranty?",
  "Can I reschedule to Friday?",
  "Refund processed, see attached.",
  "Looking forward to it.",
];

const AGENT_REPLIES = [
  "Sure — let me check on that.",
  "Yes, we still have it.",
  "Apologies for the delay, looking into it now.",
  "Just sent — let me know if anything's missing.",
  "Confirmed for 3pm Friday.",
  "Sorry to hear that — I'll start a refund right away.",
  "Order is out for delivery, should be there today.",
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}
function minutesAgo(min: number, max: number): Date {
  const ms = (min + Math.random() * (max - min)) * 60_000;
  return new Date(Date.now() - ms);
}
function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function main() {
  // ── Owner ──────────────────────────────────────────────────────────────
  const owners = await db.select().from(schema.users).limit(1);
  if (owners.length === 0) {
    console.error(
      "users table is empty — sign in to the app once first so the Clerk webhook seeds your row.",
    );
    process.exit(1);
  }
  const owner = owners[0];
  console.log(`Seeding for user ${owner.name ?? owner.email ?? owner.id}`);

  if (RESET) {
    console.log("--reset: truncating notes / messages / webhook_events / conversations / contacts / locations");
    // Order matters for FKs; cascade does the rest.
    await db.execute(sql`TRUNCATE notes, messages, webhook_events, conversations, contacts, locations RESTART IDENTITY CASCADE`);
    // Drop seeded teammate users but keep the owner.
    await db.execute(sql`DELETE FROM users WHERE clerk_id LIKE 'seed_%'`);
  }

  // ── Teammates (assignees) ──────────────────────────────────────────────
  const teammateInputs = [
    { name: "Sara Patel", email: "sara@example.com" },
    { name: "Tom Müller", email: "tom@example.com" },
    { name: "Alex Morgan", email: "alex@example.com" },
  ];
  const teammates: { id: string; name: string }[] = [];
  for (const t of teammateInputs) {
    const [row] = await db
      .insert(schema.users)
      .values({
        clerkId: `seed_${t.email.split("@")[0]}_${randomDigits(4)}`,
        email: t.email,
        name: t.name,
        initials: deriveInitials(t.name),
        tone: pick(TONES),
        role: "agent",
      })
      .returning({ id: schema.users.id, name: schema.users.name });
    teammates.push({ id: row.id, name: row.name ?? t.name });
  }
  console.log(`+ ${teammates.length} teammates`);

  // ── 3 locations ─────────────────────────────────────────────────────────
  const locInputs = [
    { name: "Acme Retail — Main", phone: "+14155550199" },
    { name: "Acme Retail — West", phone: "+14155550244" },
    { name: "Acme Retail — Pop-up", phone: "+14155550321" },
  ];
  const locations: { id: string; name: string }[] = [];
  for (const l of locInputs) {
    const [row] = await db
      .insert(schema.locations)
      .values({
        ghlLocationId: `seed_${randomDigits(20)}`,
        name: l.name,
        whatsappNumber: l.phone,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        createdBy: owner.id,
        status: "connected",
      })
      .returning({ id: schema.locations.id, name: schema.locations.name });
    locations.push({ id: row.id, name: row.name ?? l.name });
  }
  console.log(`+ ${locations.length} locations`);

  // ── Contacts + conversations + messages ────────────────────────────────
  let contactCount = 0;
  let convoCount = 0;
  let msgCount = 0;
  let noteCount = 0;

  for (const loc of locations) {
    // 8 contacts per location
    for (let i = 0; i < 8; i += 1) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const name = `${first} ${last}`;
      const [contact] = await db
        .insert(schema.contacts)
        .values({
          locationId: loc.id,
          ghlContactId: `seed_${randomDigits(20)}`,
          name,
          phone: `+1415555${randomDigits(4)}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
          tone: pick(TONES),
          customFields: {
            customerSince: "Apr 2024",
            lifetimeValue: `$${Math.floor(50 + Math.random() * 2000)}`,
            totalOrders: `${1 + Math.floor(Math.random() * 12)}`,
            lastOrder: `${1 + Math.floor(Math.random() * 30)} days ago`,
          },
        })
        .returning({ id: schema.contacts.id });
      contactCount += 1;

      // Each contact gets 1 conversation
      const channel = pick(CHANNELS);
      const status = pick(STATUSES);
      const priority = pick(PRIORITIES);
      const assignee = Math.random() < 0.6 ? pick(teammates) : null;
      const minutesOld = Math.floor(Math.random() * 60 * 24 * 5); // up to 5 days
      const lastMsgAt = new Date(Date.now() - minutesOld * 60_000);
      const lastInbound = new Date(lastMsgAt.getTime() - Math.random() * 30 * 60_000);
      const unread = status === "open" ? Math.floor(Math.random() * 4) : 0;

      const [conv] = await db
        .insert(schema.conversations)
        .values({
          locationId: loc.id,
          ghlConversationId: `seed_${randomDigits(20)}`,
          contactId: contact.id,
          channel,
          status,
          priority,
          assigneeId: assignee?.id ?? null,
          lastMessageAt: lastMsgAt,
          lastInboundAt: lastInbound,
          unreadCount: unread,
        })
        .returning({ id: schema.conversations.id });
      convoCount += 1;

      // 3-8 messages alternating direction, ordered chronologically
      const msgCountForConv = 3 + Math.floor(Math.random() * 6);
      let cursorTime = new Date(lastMsgAt.getTime() - msgCountForConv * 5 * 60_000);
      for (let m = 0; m < msgCountForConv; m += 1) {
        cursorTime = new Date(cursorTime.getTime() + (3 + Math.random() * 7) * 60_000);
        const isOut = m > 0 && m % 2 === 1;
        await db.insert(schema.messages).values({
          conversationId: conv.id,
          ghlMessageId: `seed_${randomDigits(20)}`,
          direction: isOut ? "outbound" : "inbound",
          authorId: isOut ? assignee?.id ?? null : null,
          body: isOut ? pick(AGENT_REPLIES) : pick(SAMPLE_MESSAGES),
          sentAt: cursorTime,
          status: "sent",
          deliveredAt: isOut ? cursorTime : null,
        });
        msgCount += 1;
      }

      // Optional note (30% chance)
      if (Math.random() < 0.3 && assignee) {
        await db.insert(schema.notes).values({
          conversationId: conv.id,
          authorId: assignee.id,
          body: `Customer mentioned a referral from @${pick(teammates).name.split(" ")[0]} — worth following up.`,
        });
        noteCount += 1;
      }
    }
  }

  // ── Closed conversations from earlier today (for "Resolved Today" card) ──
  // The owner's own resolves so Activity feed has variety.
  let resolvedToday = 0;
  for (const loc of locations) {
    for (let i = 0; i < 3; i += 1) {
      const [contact] = await db
        .insert(schema.contacts)
        .values({
          locationId: loc.id,
          ghlContactId: `seed_${randomDigits(20)}`,
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          phone: `+1415555${randomDigits(4)}`,
          tone: pick(TONES),
        })
        .returning({ id: schema.contacts.id });
      const resolvedAt = minutesAgo(30, 60 * 8);
      const [conv] = await db
        .insert(schema.conversations)
        .values({
          locationId: loc.id,
          ghlConversationId: `seed_${randomDigits(20)}`,
          contactId: contact.id,
          channel: pick(CHANNELS),
          status: "closed",
          priority: Math.random() < 0.2 ? "high" : "normal",
          lastMessageAt: resolvedAt,
          lastInboundAt: new Date(resolvedAt.getTime() - 5 * 60_000),
          updatedAt: resolvedAt,
        })
        .returning({ id: schema.conversations.id });
      await db.insert(schema.messages).values({
        conversationId: conv.id,
        direction: "system",
        authorId: owner.id,
        body: `Resolved by ${owner.name ?? "Sam"}`,
        sentAt: resolvedAt,
        status: "sent",
      });
      resolvedToday += 1;
    }
  }

  console.log(
    `+ ${contactCount} contacts, ${convoCount} conversations, ${msgCount} messages, ${noteCount} notes`,
  );
  console.log(`+ ${resolvedToday} 'resolved today' conversations for the dashboard`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
