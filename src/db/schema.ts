import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

function ts(name?: string) {
  return name
    ? timestamp(name, { withTimezone: true })
    : timestamp({ withTimezone: true });
}

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text(),
  name: text(),
  role: text().default("agent").notNull(),
  initials: text(),
  tone: text(),
  createdAt: ts().defaultNow().notNull(),
});

export const locations = pgTable("locations", {
  id: uuid().primaryKey().defaultRandom(),
  ghlLocationId: text("ghl_location_id").notNull().unique(),
  name: text(),
  whatsappNumber: text("whatsapp_number"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: ts("token_expires_at"),
  connectedAt: ts("connected_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  status: text().default("connected").notNull(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    ghlContactId: text("ghl_contact_id").notNull(),
    name: text(),
    phone: text(),
    email: text(),
    instagramHandle: text("instagram_handle"),
    tone: text(),
    customFields: jsonb("custom_fields"),
    createdAt: ts("created_at").defaultNow().notNull(),
    updatedAt: ts("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("contacts_location_ghl_unique").on(t.locationId, t.ghlContactId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    ghlConversationId: text("ghl_conversation_id").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    channel: text().default("whatsapp").notNull(),
    status: text().default("open").notNull(),
    priority: text().default("normal").notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id),
    lastMessageAt: ts("last_message_at"),
    lastInboundAt: ts("last_inbound_at"),
    unreadCount: integer("unread_count").default(0).notNull(),
    pinned: boolean().default(false).notNull(),
    snoozedUntil: ts("snoozed_until"),
    tags: jsonb().default([]).notNull(),
    createdAt: ts("created_at").defaultNow().notNull(),
    updatedAt: ts("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("conversations_location_ghl_unique").on(t.locationId, t.ghlConversationId),
    index("conversations_inbox_idx").on(t.locationId, t.status, t.lastMessageAt.desc()),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    ghlMessageId: text("ghl_message_id"),
    direction: text().notNull(),
    authorId: uuid("author_id").references(() => users.id),
    body: text(),
    attachments: jsonb().default([]).notNull(),
    sentAt: ts("sent_at"),
    deliveredAt: ts("delivered_at"),
    readAt: ts("read_at"),
    status: text().default("sent").notNull(),
    raw: jsonb(),
    createdAt: ts("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("messages_conversation_ghl_unique").on(t.conversationId, t.ghlMessageId),
    index("messages_thread_idx").on(t.conversationId, t.sentAt.desc()),
  ],
);

export const notes = pgTable("notes", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id),
  body: text(),
  mentions: jsonb().default([]).notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    eventType: text("event_type"),
    externalId: text("external_id").notNull(),
    payload: jsonb(),
    processedAt: ts("processed_at"),
    error: text(),
    createdAt: ts("created_at").defaultNow().notNull(),
  },
  (t) => [unique("webhook_events_source_external_unique").on(t.source, t.externalId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
