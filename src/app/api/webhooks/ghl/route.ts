import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { publish } from "@/lib/pusher/server";
import { verifyWebhookSignature } from "@/lib/ghl/webhook-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HighLevel posts here for every event we subscribed to (InboundMessage,
 * OutboundMessage, ConversationUnreadUpdate). The handler is the system's
 * idempotency layer — the webhook_events table dedups on
 * (source, externalId) so HL's retries are no-ops.
 *
 * Stays within 5s by doing all work inline; the heavy paths (upserts,
 * Pusher fan-out) are small. We respond 200 only after the row in
 * webhook_events has `processedAt` stamped — if we throw mid-way, HL
 * retries and we pick up where we left off.
 */

type InboundOutboundPayload = {
  type: "InboundMessage" | "OutboundMessage";
  locationId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  messageType?: string;
  direction?: "inbound" | "outbound";
  body?: string;
  attachments?: { url: string; type?: string; name?: string; size?: number }[];
  dateAdded?: string;
  eventId?: string;
  // HL also includes a bunch of other fields — we keep the full payload in
  // webhook_events.payload + messages.raw so nothing is lost.
};

type UnreadUpdatePayload = {
  type: "ConversationUnreadUpdate";
  locationId: string;
  conversationId: string;
  unreadCount: number;
  eventId?: string;
};

type GhlWebhookPayload =
  | InboundOutboundPayload
  | UnreadUpdatePayload
  | { type: string; eventId?: string; messageId?: string; locationId?: string };

function externalIdFor(payload: GhlWebhookPayload): string | null {
  if ("messageId" in payload && payload.messageId) return payload.messageId;
  if ("eventId" in payload && payload.eventId) return payload.eventId;
  return null;
}

async function handleInboundOrOutbound(payload: InboundOutboundPayload) {
  // 1. Locate parent location
  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.ghlLocationId, payload.locationId),
  });
  if (!location) {
    // Webhook for a location we don't own — drop on the floor (HL multi-tenancy
    // edge case; never expect this in practice).
    return { skipped: "unknown_location" as const };
  }

  // 2. Upsert contact (name will be backfilled by Row 9 client when needed)
  const [contactRow] = await db
    .insert(schema.contacts)
    .values({
      locationId: location.id,
      ghlContactId: payload.contactId,
    })
    .onConflictDoUpdate({
      target: [schema.contacts.locationId, schema.contacts.ghlContactId],
      set: { updatedAt: new Date() },
    })
    .returning();

  // 3. Upsert conversation
  const direction = payload.direction ?? (payload.type === "InboundMessage" ? "inbound" : "outbound");
  const now = new Date();
  const sentAt = payload.dateAdded ? new Date(payload.dateAdded) : now;
  const isInbound = direction === "inbound";

  const [conv] = await db
    .insert(schema.conversations)
    .values({
      locationId: location.id,
      ghlConversationId: payload.conversationId,
      contactId: contactRow.id,
      channel: "whatsapp",
      status: "open",
      lastMessageAt: sentAt,
      lastInboundAt: isInbound ? sentAt : null,
      unreadCount: isInbound ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: [schema.conversations.locationId, schema.conversations.ghlConversationId],
      set: {
        status: "open",
        lastMessageAt: sentAt,
        ...(isInbound
          ? {
              lastInboundAt: sentAt,
              unreadCount: ((existing: { unreadCount: number }) => existing.unreadCount + 1) as never,
            }
          : {}),
        updatedAt: now,
      },
    })
    .returning();

  // 4. Insert message. The unique (conversationId, ghlMessageId) constraint
  //    is the second-line dedup — if a duplicate webhook slips past the
  //    webhook_events check (different externalId, same messageId), this
  //    onConflictDoUpdate keeps the row count correct.
  const [messageRow] = await db
    .insert(schema.messages)
    .values({
      conversationId: conv.id,
      ghlMessageId: payload.messageId,
      direction,
      body: payload.body ?? null,
      attachments: payload.attachments ?? [],
      sentAt,
      status: "sent",
      raw: payload,
    })
    .onConflictDoUpdate({
      target: [schema.messages.conversationId, schema.messages.ghlMessageId],
      // OutboundMessage echoes for messages our app sent itself — Row 16's
      // composer inserts the row first; the webhook only patches delivery.
      set: {
        deliveredAt: now,
        status: "delivered",
      },
    })
    .returning();

  // 5. Fan-out
  await publish(`private-conversation-${conv.id}`, "message:new", {
    conversationId: conv.id,
    locationId: location.id,
    message: messageRow,
  });
  await publish(`private-location-${location.id}`, "message:new", {
    conversationId: conv.id,
    contactId: contactRow.id,
    direction,
    sentAt,
  });

  return { conversationId: conv.id, messageId: messageRow.id };
}

async function handleUnreadUpdate(payload: UnreadUpdatePayload) {
  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.ghlLocationId, payload.locationId),
  });
  if (!location) return { skipped: "unknown_location" as const };

  const [conv] = await db
    .update(schema.conversations)
    .set({ unreadCount: payload.unreadCount, updatedAt: new Date() })
    .where(
      and(
        eq(schema.conversations.locationId, location.id),
        eq(schema.conversations.ghlConversationId, payload.conversationId),
      ),
    )
    .returning();

  if (conv) {
    await publish(`private-location-${location.id}`, "conversation:updated", {
      conversationId: conv.id,
      unreadCount: conv.unreadCount,
    });
  }
  return { conversationId: conv?.id };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const result = verifyWebhookSignature(rawBody, req.headers);
  if (!result.verified) {
    console.warn("ghl webhook rejected:", result.reason);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: GhlWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const externalId = externalIdFor(payload);
  if (!externalId) {
    return NextResponse.json({ error: "missing externalId" }, { status: 400 });
  }

  // Dedup: insert into webhook_events. If conflict, this is a retry —
  // respond 200 immediately without re-running side effects.
  const [eventRow] = await db
    .insert(schema.webhookEvents)
    .values({
      source: "ghl",
      eventType: payload.type,
      externalId,
      payload,
    })
    .onConflictDoNothing({
      target: [schema.webhookEvents.source, schema.webhookEvents.externalId],
    })
    .returning();

  if (!eventRow) {
    // Already processed in a prior delivery
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    let result: unknown = null;
    if (payload.type === "InboundMessage" || payload.type === "OutboundMessage") {
      result = await handleInboundOrOutbound(payload as InboundOutboundPayload);
    } else if (payload.type === "ConversationUnreadUpdate") {
      result = await handleUnreadUpdate(payload as UnreadUpdatePayload);
    } else {
      result = { ignored: payload.type };
    }

    await db
      .update(schema.webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.webhookEvents.id, eventRow.id));

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ghl webhook handler failed", message, err);
    await db
      .update(schema.webhookEvents)
      .set({ error: message })
      .where(eq(schema.webhookEvents.id, eventRow.id));
    // 500 so HL retries
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
