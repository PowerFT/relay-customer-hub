# Relay Customer Hub — MVP Build Plan

Sequential plan for Claude Code. Execute rows in order. After each row, **stop and wait** 
for the user to say 'continue' before moving on. The spreadsheet version of this plan 
(`Relay_MVP_Build_Plan.xlsx`) holds the same data with phase-colored rows for human review.

**MVP goal**: connect 3 HighLevel WhatsApp numbers, receive inbound + send outbound, with a 
working Dashboard and Conversations UI.

**Design reference**: see `./reference/`. The canonical files Claude Code reads are:
- `./reference/design.md` — full design brief (tech stack, tokens, layout per screen)
- `./reference/styles.css` — every CSS variable and channel color
- `./reference/shell.jsx`, `dashboard.jsx`, `conversations.jsx`, `icons.jsx`, `mock-data.js` — visual prototype components

**Tech stack** (set in stone for this MVP): Next.js 14 App Router + TypeScript, Tailwind + 
shadcn/ui, Neon Postgres + Drizzle, Clerk auth, Pusher real-time, Vercel hosting, HighLevel 
Conversations API V2 for WhatsApp.

---

## Row 1 — Project scaffolding

**Phase**: 1 — Foundation  
**Depends on**: —

**Description**: Initialize the Next.js 14 codebase with TypeScript, Tailwind, shadcn/ui, and core dependencies. Establishes the repo structure that everything plugs into.

### Claude Code prompt

**Step 0 — verify workspace**: confirm these files exist by running `view` on each:
• `./BUILD_PLAN.md` (this plan)
• `./reference/design.md` (design brief)
• `./reference/styles.css` (design tokens)
If any are missing, stop and ask the user to unzip `relay-mvp-bundle.zip` into the current directory.

**Step 1 — scaffold the Next.js app**: Initialize a Next.js 14 App Router project at the repo root using `pnpm create next-app@latest .` with TypeScript, ESLint, Tailwind CSS, `src/` directory, App Router, and `@/*` import alias. When the scaffolder asks about overwriting non-empty directory, accept — the existing `BUILD_PLAN.md`, `reference/`, and `Relay_MVP_Build_Plan.xlsx` files don't conflict with Next.js's output.

Install: lucide-react, class-variance-authority, clsx, tailwind-merge, zod, date-fns. Run `pnpm dlx shadcn@latest init` (Default style, Slate base, CSS variables yes) and add components: button, input, avatar, badge, tabs, dropdown-menu, tooltip, scroll-area, separator, sheet, dialog, select, textarea, sonner, skeleton, card. Create folders: `src/app`, `src/components/{shell,conversations,dashboard,ui}`, `src/lib/{ghl,pusher,db,utils}`, `src/hooks`, `src/types`. Add `.env.example` with placeholder vars (DATABASE_URL, CLERK_*, GHL_*, PUSHER_*, ENCRYPTION_KEY). Initialize git (if not already) with a sensible `.gitignore` (node_modules, .env, .next, .vercel — but NOT reference/, NOT BUILD_PLAN.md). Verify `pnpm dev` runs cleanly on http://localhost:3000. Commit as `chore: scaffold next.js app`. Stop and wait for user 'continue' before Row 2.

---

## Row 2 — Initial Vercel + GitHub setup

**Phase**: 1 — Foundation  
**Depends on**: 1

**Description**: Push to GitHub, deploy to Vercel, and set up the preview-URL pipeline. This unlocks real HighLevel OAuth + webhook testing from day one — no localhost workarounds, no ngrok.

### Claude Code prompt

Push the scaffolded Next.js app to a new private GitHub repository and provision Vercel. Specifically:
1. Create a GitHub repo, push the row-1 scaffold to `main`.
2. In Vercel, import the GitHub repo. Framework preset: Next.js. Build command default. Root directory: `./`.    Production branch: `main`. Confirm the first deploy succeeds and the production Vercel URL renders the    empty Next.js starter page.
3. In Vercel project settings → Environment Variables, add empty placeholders (in both Production and Preview    scopes) for every env var the app will need later: CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET,    NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL, GHL_CLIENT_ID, GHL_CLIENT_SECRET,    GHL_REDIRECT_URI, GHL_WEBHOOK_SECRET, OAUTH_STATE_SECRET, ENCRYPTION_KEY, PUSHER_APP_ID, PUSHER_KEY,    PUSHER_SECRET, PUSHER_CLUSTER, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER, CRON_SECRET. Use 'TODO'    as the value — each row in this plan will fill in the real value when that feature is built. Note:    DATABASE_URL is intentionally skipped here — Neon's Vercel integration sets it at row 4.
4. Add `.github/workflows/ci.yml` running on every PR and push to main: `pnpm install --frozen-lockfile`,    `pnpm typecheck`, `pnpm lint`. No tests yet (added at row 23). Mark these checks as required on `main`.
5. Open a trivial PR (change README) and verify: Vercel preview URL appears as a PR comment, CI checks pass.
6. Document in README.md: production URL pattern `https://{project}.vercel.app`, preview pattern    `https://{project}-git-{branch}.vercel.app`. The production URL is what gets registered with HighLevel    marketplace at the production cutover row.
Result: from this point on, every commit produces a preview URL. All HighLevel OAuth + webhook work in subsequent rows can be developed and tested against real public URLs.

---

## Row 3 — Design tokens & global theme

**Phase**: 1 — Foundation  
**Depends on**: 1

**Description**: Port the brand palette, channel colors, typography, and radius scale from the prototype CSS into Tailwind config + globals.css so every later component renders on-brand.

### Claude Code prompt

Read `./reference/styles.css` and `./reference/design.md` §2. Port all CSS variables into `src/app/globals.css` under `:root` (primary, sidebar-bg, canvas, surface, border, text-primary, text-secondary, unread-badge, success, warning, danger, and channel colors c-whatsapp through c-sms). Extend `tailwind.config.ts` with these colors as named utilities (e.g. `bg-primary`, `bg-canvas`, `text-text-primary`). Add Inter via `next/font/google` in root layout, set as default font in tailwind. Set radius scale: rounded-xl 12px, rounded-2xl 16px. Add stat-card gradient utilities (gradient-blue, gradient-pink, gradient-orange, gradient-purple) per design.md. Verify by rendering a sample primary button and 4 gradient cards on a test route `/_design-check` (delete this route in a later step).

---

## Row 4 — Database schema (Neon + Drizzle)

**Phase**: 1 — Foundation  
**Depends on**: 1, 2

**Description**: Provision Neon Postgres and wire it into Vercel via the Neon integration so every preview deploy gets its own DB branch automatically. Then define the schema that backs everything.

### Claude Code prompt

Provision a Neon Postgres project. In the Neon dashboard, install the Vercel integration (Integrations → Vercel) and link it to the Vercel project from row 2. This auto-injects DATABASE_URL into Vercel Production + Preview env vars and creates a fresh DB branch for every preview deploy — overriding the 'TODO' placeholder from row 2. Also install Neon's GitHub app on the repo so PRs trigger branch creation. Pull the local DATABASE_URL into `.env.local` via `vercel env pull`.

Install `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `postgres`. Create `src/db/schema.ts` with tables:
• users (id uuid pk, clerkId text unique, email text, name text, role text default 'agent', initials text, tone text, createdAt timestamptz)
• locations (id uuid pk, ghlLocationId text unique, name text, whatsappNumber text, accessTokenEnc text, refreshTokenEnc text, tokenExpiresAt timestamptz, connectedAt timestamptz, createdBy uuid → users.id, status text default 'connected')
• contacts (id uuid pk, locationId uuid → locations.id, ghlContactId text, name text, phone text, email text, instagramHandle text, tone text, customFields jsonb, createdAt, updatedAt; unique(locationId, ghlContactId))
• conversations (id uuid pk, locationId uuid → locations.id, ghlConversationId text, contactId uuid → contacts.id, channel text default 'whatsapp', status text default 'open', priority text default 'normal', assigneeId uuid → users.id, lastMessageAt timestamptz, lastInboundAt timestamptz, unreadCount int default 0, pinned boolean default false, snoozedUntil timestamptz, tags jsonb default '[]', createdAt, updatedAt; unique(locationId, ghlConversationId); index on (locationId, status, lastMessageAt desc))
• messages (id uuid pk, conversationId uuid → conversations.id, ghlMessageId text, direction text, authorId uuid → users.id, body text, attachments jsonb default '[]', sentAt timestamptz, deliveredAt timestamptz, readAt timestamptz, status text default 'sent', raw jsonb, createdAt; unique(conversationId, ghlMessageId); index on (conversationId, sentAt desc))
• notes (id uuid pk, conversationId uuid → conversations.id, authorId uuid → users.id, body text, mentions jsonb default '[]', createdAt)
• webhook_events (id uuid pk, source text, eventType text, externalId text, payload jsonb, processedAt timestamptz, error text, createdAt; unique(source, externalId))

Export a configured `db` client from `src/db/index.ts` using neon-http driver. Add `drizzle.config.ts`. Add scripts: `db:generate`, `db:push`, `db:studio`. Run `db:push` and verify all tables exist on the main Neon branch.

---

## Row 5 — Clerk authentication

**Phase**: 1 — Foundation  
**Depends on**: 1, 4

**Description**: Gate the app behind Clerk auth. Sync signed-in users into our `users` table so we can reference them as agents and assignees.

### Claude Code prompt

Install `@clerk/nextjs` and `svix`. Wrap root layout with `<ClerkProvider>`. Create `middleware.ts` that protects everything except `/sign-in`, `/sign-up`, `/api/webhooks/*`. Add `(auth)/sign-in/[[...sign-in]]/page.tsx` and `(auth)/sign-up/[[...sign-up]]/page.tsx` using shadcn-styled Clerk components. Create `(dashboard)` route group that will host all authenticated pages. Add `POST /api/webhooks/clerk` route that verifies the svix signature using `CLERK_WEBHOOK_SECRET` and on `user.created` / `user.updated` upserts into the `users` table (clerkId, email, name, initials derived from name, tone picked from a 6-color rotation). Add a `getCurrentUser()` server helper in `src/lib/auth.ts` that returns the row from `users` for the current Clerk session.

Set real values for the placeholders from row 2: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` in Vercel (Production + Preview) AND `.env.local`. In Clerk dashboard, set the webhook endpoint to `https://{your-production-vercel-url}/api/webhooks/clerk`.

---

## Row 6 — App shell (Sidebar + Topbar)

**Phase**: 1 — Foundation  
**Depends on**: 3, 5

**Description**: Build the persistent dark sidebar and white topbar that wrap every authenticated page. The visual frame for both Dashboard and Conversations.

### Claude Code prompt

Read `./reference/shell.jsx` and `./reference/styles.css` (sidebar + topbar sections). Build the shell at `src/app/(dashboard)/layout.tsx`. Components:
• `src/components/shell/sidebar.tsx`: 240px expanded / 80px collapsed, sticky h-screen, dark bg `--sidebar-bg`.   Logo block at top, then nav items: Dashboard (LayoutDashboard), Conversations (MessageSquare + unread badge),   Contacts (Users), Broadcasts (Inbox), Reports (BarChart3), Settings (Settings). Active item: 3px green left   accent bar + lighter bg block. User card at bottom with Clerk avatar + name + role. Collapse toggle in header,   persists to localStorage.
• `src/components/shell/topbar.tsx`: 60px, global search (420px wide, ⌘K hint), status pill, notification bell   with red dot, plus button, user avatar. On `/conversations` show channel filter chips after the search.
Use `next/link` for nav. Use `usePathname()` for active state. For MVP, Contacts/Broadcasts/Reports/Settings routes render an 'Under construction' page. Wire the Conversations badge to a `useUnreadCount()` hook that returns 0 for now — to be replaced in row 13.

---

## Row 7 — HighLevel OAuth marketplace app

**Phase**: 2 — HighLevel  
**Depends on**: 2, 4, 5

**Description**: Implement the OAuth 2.0 flow that lets an agent connect a HighLevel sub-account (= one WhatsApp number). Store encrypted tokens per location. Uses the Vercel preview URL from row 2.

### Claude Code prompt

Implement HighLevel marketplace OAuth.

**Setup first**: Register a HighLevel marketplace app at https://marketplace.gohighlevel.com (start as Private). Set redirect URI to your **Vercel production URL** + `/api/oauth/callback`. Get client ID + secret. Subscribe to scopes: `conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly`. Set values for `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`, `OAUTH_STATE_SECRET` (any 32+ char random), `ENCRYPTION_KEY` (32-byte hex from `openssl rand -hex 32`) in Vercel Production AND `.env.local` (for `pnpm dev`). For preview deploys, you'll either point the same dev app at the preview URL pattern, or create a second 'dev' marketplace app — see the Production cutover row for the prod/dev split.

**Code**: Create `src/lib/crypto.ts` exporting `encrypt(plain): string` and `decrypt(cipher): string` using AES-256-GCM with `ENCRYPTION_KEY`. Then:
• `GET /api/oauth/connect` — redirects to `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${GHL_REDIRECT_URI}&client_id=${GHL_CLIENT_ID}&scope=<all scopes above>`. Generate a random `state`, sign it with `OAUTH_STATE_SECRET`, store in httpOnly cookie.
• `GET /api/oauth/callback` — validates state cookie. Exchanges `code` at `POST https://services.leadconnectorhq.com/oauth/token` with form body (client_id, client_secret, grant_type='authorization_code', code, redirect_uri, user_type='Location'). Extracts access_token, refresh_token, expires_in, locationId. Calls `GET /locations/${locationId}` (Version: 2021-07-28) to fetch name + phone numbers. Encrypts tokens and upserts into `locations` (createdBy = current user). Redirects to `/settings/locations?connected=${locationId}`.
• `src/lib/ghl/tokens.ts`: `getValidAccessToken(locationId)` — checks expiry (refresh if <60s remaining), POSTs refresh to /oauth/token with grant_type='refresh_token', updates DB, returns decrypted access_token. Add a 5-second mutex per locationId to avoid concurrent refresh.

---

## Row 8 — Location management UI

**Phase**: 2 — HighLevel  
**Depends on**: 6, 7

**Description**: Settings page where the user connects, views, and disconnects HighLevel locations. How the user wires up the 3 WhatsApp numbers needed for the MVP.

### Claude Code prompt

Build `src/app/(dashboard)/settings/locations/page.tsx` (server component). Query `locations` for the current user. Render a Card per location showing: name, masked WhatsApp number (+1 (415) ••• 0123), connected date (date-fns formatDistance), status badge (Connected green / Token expired amber / Disconnected red), Disconnect button. Empty state: 'Connect at least 3 HighLevel sub-accounts to start receiving WhatsApp messages' with a primary 'Connect HighLevel' button linking to `/api/oauth/connect`. Header has a 'Connect another' button. On `?connected={id}` query param after OAuth callback, show a sonner toast 'Location connected successfully'. Disconnect action: `POST /api/locations/:id/disconnect` — soft-deletes (status='disconnected'), revokes the HL token via `POST /oauth/revoke`. Add a banner at the top if connected count < 3: 'Connect {3 - n} more locations to complete MVP setup.'

---

## Row 9 — Typed HighLevel API client

**Phase**: 2 — HighLevel  
**Depends on**: 7

**Description**: Single typed wrapper around the HighLevel Conversations API V2. All server code talks to HighLevel through this — never inline fetch.

### Claude Code prompt

Create `src/lib/ghl/client.ts`. Define a `ghlFetch(locationId, path, init)` helper that: gets a valid access token from row 7's helper; sets headers `Authorization: Bearer <token>`, `Version: 2021-04-15`, `Accept: application/json`, `Content-Type: application/json`; calls `https://services.leadconnectorhq.com${path}`; on 401 force-refreshes and retries once; on 429 reads Retry-After and throws a typed RateLimitError; logs method, path, status, ms.
Define Zod schemas in `src/lib/ghl/schemas.ts` for Conversation, Message, Contact, Location. Export typed functions:
• conversations.search(locationId, { contactId?, status?, assignedTo?, limit, startAfter? })
• conversations.get(locationId, conversationId)
• conversations.messages.list(locationId, conversationId, { limit, lastMessageId? })
• conversations.messages.send(locationId, { conversationId, contactId, type: 'WhatsApp', message, attachments? })
• conversations.read(locationId, conversationId)
• contacts.get(locationId, contactId)
• contacts.upsert(locationId, { phone, name, email, ... })
• locations.get(locationId)
Each function parses the response through its Zod schema and returns the typed shape. Throw `GhlApiError` with status + message for non-2xx. Write a small unit test stubbing fetch to confirm shape.

---

## Row 10 — Inbound webhook receiver

**Phase**: 2 — HighLevel  
**Depends on**: 2, 4, 7, 9

**Description**: The endpoint HighLevel calls when a WhatsApp message arrives. Persists the message, updates conversation state, and fans out via Pusher. Registered at the Vercel preview URL.

### Claude Code prompt

Create `POST /api/webhooks/ghl` with `export const runtime = 'nodejs'` (not edge — we need crypto + longer timeouts). In the HighLevel marketplace app config, set the webhook URL to your **Vercel production URL** + `/api/webhooks/ghl` and subscribe to events: `InboundMessage`, `OutboundMessage`, `ConversationUnreadUpdate`. Copy HL's webhook secret to `GHL_WEBHOOK_SECRET` in Vercel + `.env.local`.

Handler logic:
1. Read raw body. Verify `X-WH-Signature` header against `GHL_WEBHOOK_SECRET` using HMAC-SHA256, constant-time compare.
2. Parse payload. Compute `externalId = payload.messageId ?? payload.eventId`. Insert into `webhook_events` with    `ON CONFLICT (source, externalId) DO NOTHING`. If conflict (already processed), return 200 immediately.
3. Switch on `payload.type`:
   • InboundMessage: upsert contact by ghlContactId (fetch from API if name missing); upsert conversation      (channel='whatsapp', status='open', lastInboundAt=now, increment unreadCount); insert message (direction='in').      Publish `private-location-${locationId}` event `message:new` with full payload.
   • OutboundMessage: try-insert message by ghlMessageId; if already exists (sent from our app — see row 16),      only update delivery status; otherwise insert (direction='out', authorId=null since sent from HL UI).      Publish `message:new` to the same channel.
   • ConversationUnreadUpdate: update unreadCount and publish `conversation:updated`.
4. Mark `webhook_events.processedAt = now`. On any error, store `error` and return 500 so HL retries.
5. Always respond within 5s — heavy work should be inline since we're idempotent and small.
Add a `bin/ghl-replay.ts` CLI to replay a stored webhook for debugging.

Test: from HighLevel, send a WhatsApp message to one of your connected location numbers. Confirm row appears in `webhook_events`, `messages`, `conversations`. Use Vercel Function logs to debug.

---

## Row 11 — Pusher real-time fan-out

**Phase**: 2 — HighLevel  
**Depends on**: 5, 10

**Description**: Wire Pusher Channels for live message delivery to the UI. Without this, agents have to refresh to see new messages.

### Claude Code prompt

Sign up for Pusher Channels (https://pusher.com) and create a new app. Copy app id, key, secret, and cluster. Set `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` in Vercel (Production + Preview) AND `.env.local`.

Install `pusher` and `pusher-js`. Create:
• `src/lib/pusher/server.ts` — exports `pusherServer` configured from env. Helper `publish(channel, event, data)`   with retry on failure.
• `src/lib/pusher/client.ts` — exports a singleton `pusherClient` (lazy init) using NEXT_PUBLIC_PUSHER_KEY +   CLUSTER, with `authEndpoint: '/api/pusher/auth'`, forceTLS: true.
• `POST /api/pusher/auth` — authenticates private channels. Parses `socket_id` and `channel_name`. For   `private-location-{id}`, verify the current user has access (locations.createdBy for MVP). For   `private-conversation-{id}`, verify via join. Returns `pusherServer.authorizeChannel(socket_id, channel_name)`.
• `src/hooks/use-pusher-channel.ts` — `usePusherChannel<T>(channel, event, handler)`. Subscribes on mount,   binds the event, returns unsubscribe in cleanup. Reuses the global pusherClient.
Add a test page `/_pusher-check` that subscribes and shows the last event; verify by calling the publish helper from a server action and seeing the event in real-time. Also re-trigger an inbound message from HL and verify the row 10 webhook now successfully publishes to the channel.

---

## Row 12 — Conversations page shell

**Phase**: 3 — Conversations  
**Depends on**: 6

**Description**: The top-level Conversations route that hosts the 4-column layout: channel rail + list + thread + contact panel.

### Claude Code prompt

Create `src/app/(dashboard)/conversations/page.tsx` (client component since it has rich interactivity). Layout is a CSS grid `grid-cols-[72px_340px_1fr_360px]` with `min-h-0` everywhere to make inner scrolling work. State (URL-synced via nuqs or simple useSearchParams):
• channelFilter: 'all' | 'whatsapp' | ... (default 'all')
• activeConversationId: uuid | null
• panelOpen: boolean (default true)
Render `<ChannelRail>`, `<ConversationList>`, `<Thread>` (or empty state if no active id), `<ContactPanel>` (if panelOpen). When the panel is closed, replace with a floating reopen button as in `./reference/conversations.jsx`. Below 1280px viewport auto-collapse the panel.

---

## Row 13 — Channel rail

**Phase**: 3 — Conversations  
**Depends on**: 11, 12

**Description**: The 72px-wide vertical strip of channel tiles with unread badges. For MVP only WhatsApp is live; other channels render as 'Coming soon' placeholders.

### Claude Code prompt

Build `src/components/conversations/channel-rail.tsx`. Reference `./reference/conversations.jsx` ChannelRail. Renders an `<All>` tile at top with the MessagesSquare icon and total unread, then channel tiles for WhatsApp (enabled, brand green), then disabled tiles for Messenger / Instagram / TikTok / LinkedIn / Webchat / Email / SMS (grayscaled, cursor-not-allowed, Tooltip 'Coming soon — connect via HighLevel'). Each tile: 56×56, rounded-2xl, white bg, shadow-sm; active tile has 3px green left accent + scale-105. Red unread badge top-right when count > 0.
Data: create a server route `GET /api/channel-counts?locationId={all|id}` returning `{ all: number, whatsapp: number, messenger: number, ... }` computed by summing `conversations.unreadCount` grouped by channel. On the client use TanStack Query (`useChannelCounts`). Subscribe to `private-location-{id}` `message:new` to invalidate. Also update the sidebar Conversations badge from this hook (replace row 6's stub).

---

## Row 14 — Conversation list

**Phase**: 3 — Conversations  
**Depends on**: 9, 11, 13

**Description**: Middle column. Search, status tabs (Open/Snoozed/Closed), and the scrollable list of conversations with avatar, preview, time, unread, and assignee chip.

### Claude Code prompt

Build `src/components/conversations/conversation-list.tsx` and `<ConversationListItem>`. Reference `./reference/conversations.jsx` ConvoList + ConvoListItem and design.md §5.2. Header (sticky): search input, segmented tabs `Open · Snoozed · Closed` with counts, sort dropdown. List item: 44px avatar with channel-color dot indicator bottom-right, contact name, preview, timestamp, unread bubble (brand green), assignee chip if assigned. Active row: light teal bg + 3px green left accent. Unread row: bolder name & preview.
Server route `GET /api/conversations?locationId=&channel=&status=&search=&cursor=&limit=30` — paginated by `(lastMessageAt, id)` cursor. Joins to contacts, assignee, and most-recent message preview. Returns `{ items, nextCursor }`. Hook: `useConversations(filters)` with TanStack Query's `useInfiniteQuery`. Use react-intersection-observer or a sentinel ref for auto-load. Subscribe to `private-location-{id}` `message:new` and `conversation:updated` — patch the cache in place to avoid full refetches; new conversation jumps to top. Empty state when filtered list is 0: gray circle + MessageSquare icon + 'No conversations' + 'Nothing matches your current filters'.

---

## Row 15 — Thread view

**Phase**: 3 — Conversations  
**Depends on**: 9, 11, 13

**Description**: The message canvas: bubbles, date dividers, system events, read receipts, attachments. Core agent workspace.

### Claude Code prompt

Build `src/components/conversations/thread.tsx` and `<MessageBubble>`. Reference `./reference/conversations.jsx` Thread + MessageBubble and design.md §5.3. Header (64px sticky): contact avatar, name, channel badge, online dot, phone/handle subline, last-seen text, right-aligned action icons (Assign / Snooze / Tag / Resolve / More). Canvas: scrollable, padded responsively per design.md. Bubbles:
• Inbound: left-aligned, white bg, border, rounded-2xl with rounded-bl-sm on the avatar-adjacent corner.
• Outbound: right-aligned, `--primary-soft` bg, rounded-2xl with rounded-br-sm. Show 'via WhatsApp · {Author}' meta above.
• Read receipts inside bubble bottom-right: Check (sent) / CheckCheck gray (delivered) / CheckCheck blue (read).
• Date dividers as centered pills. System events as centered muted text.
• Attachments: image with light placeholder gradient + filename overlay; file with PDF/document badge + name + size.
Server routes:
• GET /api/conversations/:id → conversation + contact + assignee
• GET /api/conversations/:id/messages?cursor=&limit=50 — reverse-chronological, paginated.
• POST /api/conversations/:id/read — zeroes unreadCount + calls `ghlClient.conversations.read`.
Hooks: `useConversation(id)`, `useMessages(id)`. On mount: call read. Subscribe to `private-conversation-{id}` `message:new` and append to cache. Auto-scroll-to-bottom on first load and on new outbound; stick-to-bottom-if-near-bottom logic for inbound.

---

## Row 16 — Composer with optimistic send

**Phase**: 3 — Conversations  
**Depends on**: 9, 10, 11, 15

**Description**: The reply box at the bottom of the thread. Sends through HighLevel and surfaces the message instantly with optimistic UI, then reconciles with the server response and webhook echo.

### Claude Code prompt

Build `src/components/conversations/composer.tsx`. Reference `./reference/conversations.jsx` Composer. Channel pill above the textarea showing 'Replying via WhatsApp' with the channel color. Auto-grow textarea (1–6 rows). Toolbar buttons: paperclip, image, templates, emoji (Smile from lucide), voice (mic). Round green send button right side. Keyboard: Enter sends (unless Shift held), Cmd/Ctrl+Enter also sends. Disabled when empty.
Send flow:
1. On submit, generate `tempId = nanoid()`. Optimistically insert a message into cache with    `{ id: tempId, direction: 'out', body, status: 'sending', sentAt: now() }`. Auto-scroll. Clear input.
2. POST /api/conversations/:id/messages with `{ tempId, body, attachments }`.
3. Server: calls `ghlClient.conversations.messages.send`, gets back `ghlMessageId`. Inserts a row with `ghlMessageId`,    `direction='out'`, `authorId=currentUser`, `status='sent'`. Returns the row. Publishes `message:new` to    `private-conversation-{id}` (and `private-location-{id}` so the list updates).
4. Client receives the response, replaces the tempId entry by id.
5. When the HL OutboundMessage webhook later echoes, the webhook handler detects `ghlMessageId` exists and only    patches delivery status (no duplicate row). The Pusher event from the webhook is also deduped by `ghlMessageId`    on the client.
Error: on non-2xx, set status='failed' with red exclamation + 'Retry' button.
**24-hour WhatsApp window**: read `conversation.lastInboundAt`. If null or > 24 hours ago, disable the textarea and show an amber banner: 'Outside the 24-hour window. Choose an approved WhatsApp template to start a new conversation.' Add a 'Choose template' button that opens a Dialog. For MVP populate with 2 mock templates and a 'Coming soon' notice on send; no actual template send required for MVP.
Keyboard hint at bottom: `⏎ Send · Shift+⏎ New line · ⌘⏎ Send`.

---

## Row 17 — Contact panel

**Phase**: 3 — Conversations  
**Depends on**: 9, 11, 15

**Description**: Right sidebar with Contact / Notes / History tabs. Context on who the agent is talking to and what's been said before.

### Claude Code prompt

Build `src/components/conversations/contact-panel.tsx`. Reference `./reference/conversations.jsx` ContactPanel and design.md §5.4. 360px wide, collapsible. Three tabs:
• Contact: large 72px avatar, name with verified tick if applicable, location · timezone subline. Channels section   lists handles (WhatsApp / Email / Instagram / SMS) — for MVP only WhatsApp will have a real value, others render as   '— not linked'. Tags section: colored pills (green/amber/blue tones) + an 'Add' button (no-op for MVP). Customer details   key-value list: customer since, lifetime value (pulled from HL contact customFields if present, else '—'), total orders,   last order. Assigned-to dropdown showing all `users` (uses row 18).
• Notes: list of notes for this conversation, rendered as yellow-tinted cards with author + relative time. Add-note   textarea below with @mention support (use a simple `@` trigger that lists users from a `/api/users` route).   Submit posts to `POST /api/conversations/:id/notes`.
• History: query `GET /api/contacts/:contactId/conversations` — returns prior conversations on this contact across   channels, chronological. Each row: channel icon + title (latest message preview) + relative time + assignee initials.
Close button (X) collapses the panel. Subscribe to `private-conversation-{id}` for `note:added`.

---

## Row 18 — Assignment

**Phase**: 4 — Features  
**Depends on**: 14, 15, 17

**Description**: Let agents assign a conversation to a teammate, including themselves. Shows a system event in the thread and notifies the new assignee in real time.

### Claude Code prompt

Build `<AssignDropdown>` used in (a) the thread header action icons and (b) the Contact panel 'Assigned to' row. Lists all rows from `users` (route `GET /api/users`), with 'Unassign' option. On select: `POST /api/conversations/:id/assign` with `{ assigneeId | null }`. Server: updates `conversations.assigneeId`, inserts a system message row (`direction='system'`, body='${Actor.name} assigned this conversation to ${Assignee.name}'), publishes `conversation:assigned` and `message:new` to `private-conversation-{id}` and `private-location-{id}`. Show a sonner toast on success. Keyboard shortcut `A` in the thread opens the picker (use react-hotkeys-hook). The list-item assignee chip should update without a refetch.

---

## Row 19 — Resolve & Snooze

**Phase**: 4 — Features  
**Depends on**: 15, 17

**Description**: Status transitions that move conversations out of the active queue. Snooze auto-reopens after the timer via Vercel Cron.

### Claude Code prompt

Implement Resolve and Snooze in the thread header actions.
• Resolve: `POST /api/conversations/:id/resolve` → sets `status='closed'`, inserts system message 'Resolved by {agent}'.   Publishes `conversation:updated`. Toast: 'Conversation resolved. Press ⌘Z to undo'. Implement undo by re-opening within   10s window (toast-attached action).
• Snooze: opens a dropdown with options (1 hour, 4 hours, Tomorrow 9am, Next Monday 9am, Custom…). On select:   `POST /api/conversations/:id/snooze` with `{ until: ISOString }` → sets `status='snoozed'`, `snoozedUntil=until`.   Inserts system message 'Snoozed until {formatted time} by {agent}'.
• Unsnooze cron: add to `vercel.json` a cron `*/5 * * * *` calling `GET /api/cron/unsnooze`. The route finds   `status='snoozed' AND snoozedUntil <= now()`, flips them to 'open', inserts system messages, publishes events. Protect   the endpoint with `Authorization: Bearer ${CRON_SECRET}` header check. Set `CRON_SECRET` value in Vercel   (Production + Preview) and `.env.local`. Note that crons run only in Production by default — that's fine; we'll verify in   Production cutover.
Keyboard: `E` resolves, `S` opens snooze menu.

---

## Row 20 — Dashboard stat cards

**Phase**: 4 — Features  
**Depends on**: 6, 15

**Description**: The 4 gradient stat cards at the top of the dashboard. Real numbers from the DB, scoped to the chosen location and date range.

### Claude Code prompt

Build `src/app/(dashboard)/dashboard/page.tsx` (server component) and `src/components/dashboard/stat-card.tsx`. Reference `./reference/dashboard.jsx` and design.md §4.1. The StatCard props: title, value, IconComp, gradient ('gradient-blue' | 'gradient-pink' | 'gradient-orange' | 'gradient-purple'), leftLabel, leftValue, rightLabel, rightValue, trendPct (positive or negative). Renders the card with: title (top-left), big number (40px font-bold), trend chip (ArrowUp/Down + %), icon (top-right in rounded-md tile), bottom split row with two values separated by a thin vertical divider, and a 3px white progress bar at the bottom showing leftValue / (leftValue + rightValue) ratio.
Server route `GET /api/stats?range=7d&locationId=all`. Returns:
• totalMessages: count(*) from messages where sentAt in range, split by direction
• unread: sum(conversations.unreadCount) where status='open', split by assigned vs unassigned
• active: count(*) where status in ('open','snoozed'), split open vs snoozed
• resolved: count(*) where status='closed' and updatedAt::date = current_date, split (all resolved) vs escalated (priority='high' before close)
Each includes trendPct vs previous period of same length. Use a single SQL function or 4 parallel queries. Render the 4 cards in a `grid-cols-4 gap-5`. Greeting H1: 'Good {morning|afternoon|evening} {firstName}' + subline.

---

## Row 21 — Dashboard charts

**Phase**: 4 — Features  
**Depends on**: 20

**Description**: Message Volume (grouped bar) and Avg Response Time (smooth area) cards. Recharts wired to the database.

### Claude Code prompt

Install `recharts`. Build `src/components/dashboard/chart-card.tsx` (title + subtitle + dropdown + body slot). Then build:
• `<MessageVolumeChart>` — grouped BarChart, x=day of week, two bars: Inbound (brand teal) and Outbound (light blue #9ECEFF),   rounded top corners (radius=[3,3,0,0]). Y-axis with 4 ticks, faint gridlines. Legend below: two dots + labels.
• `<ResponseTimeChart>` — AreaChart, smooth curve (type='monotone'), x=month, y=minutes, area fill `--primary` at 15% opacity,   stroke `--primary` 2.5px. Show a tooltip with formatted '{m}m {s}s'. Highlight the most-recent month with a slightly larger dot.   Reference dashed line at target (10 minutes).
Server routes:
• GET /api/stats/volume?range=7d&locationId= → [{ day: 'Mon', inbound, outbound }, ...]
• GET /api/stats/response-time?range=12m&locationId= → [{ m: 'JAN', v: 14.2 }, ...] where v = median minutes between first inbound   and first outbound per conversation that started that month.
Place both cards in a `grid-cols-2 gap-5` row on the dashboard, after the stat-card row.

---

## Row 22 — Latest activity feed

**Phase**: 4 — Features  
**Depends on**: 11, 20

**Description**: The live activity card on the dashboard. Bottom-right of the 3-card row. Newest agent-relevant events first.

### Claude Code prompt

Build `<LatestActivityCard>` for the dashboard. Reference design.md §4.4 right column and `./reference/dashboard.jsx` Latest Activity. Card title 'Latest Activity' + 'Today' dropdown. Body is a vertical list of up to 6 rows. Each row: small colored channel dot (left), bold title, gray subtitle (truncate single line), time pill (right, rounded-full, bg-canvas). Click navigates to `/conversations?id={conversationId}`. Server route `GET /api/activity?limit=6&locationId=` — UNION of recent inbound messages (title 'New WhatsApp from {Contact}'), recent resolves (title '{Contact} resolved'), recent assigns (title 'Assigned to {Agent}'), and recent escalations — limit 6 ordered by createdAt desc. Subscribe to `private-location-{id}` `message:new` / `conversation:updated` to prepend events live. Add a fade-in animation on new items. Place card in `grid-cols-3 gap-5` row at the bottom of the dashboard alongside Agent Performance and Channel Mix (which can be stubbed for MVP — mark them clearly as 'Live data coming soon' if needed).

---

## Row 23 — Optimistic send dedup hardening

**Phase**: 5 — Deploy & Test  
**Depends on**: 10, 16

**Description**: Race-condition tests for the send pipeline. A duplicate row appearing under race conditions would silently corrupt the inbox — must be bulletproof before going live.

### Claude Code prompt

Audit and harden the optimistic send + outbound webhook flow. Confirm the following invariants and add tests for each:
1. When the agent sends a message, exactly ONE row exists in `messages` for that send, regardless of webhook timing.
2. Order: API response arrives first → webhook arrives second → webhook upserts (no new row).
3. Order: Webhook arrives first → API response arrives second → API response sees existing ghlMessageId and only patches.
4. Duplicate webhook delivery is no-op (webhook_events table is the dedupe layer).
5. Client never shows a duplicate bubble even when both Pusher events and the API response are received.
Implement using Vitest + a tiny in-memory DB stub. Add `tests/composer-dedup.spec.ts` covering all 4 orderings. Wire into `pnpm test` and add `pnpm test` to the CI workflow created in row 2. Also add a small chaos script `bin/chaos-send.ts` that sends 50 messages back to back through 3 locations and asserts row counts match expected — run manually before launch.

---

## Row 24 — Error states, empty states, skeletons

**Phase**: 5 — Deploy & Test  
**Depends on**: 14, 15, 16, 17, 20

**Description**: Polish pass. Every interactive surface should handle loading, empty, and error states gracefully — no broken UIs even if a network call fails.

### Claude Code prompt

Add error boundaries and proper states across the app:
• Route-level `error.tsx` for each segment ((dashboard), conversations, settings) — friendly message + 'Try again' button +   'Report issue' link that opens a mailto.
• Skeletons (shadcn Skeleton): ConversationList (10 fake rows), Thread (header + 5 bubbles), ContactPanel (hero + 3 sections),   Dashboard (4 stat cards, 2 charts).
• Empty states: ConversationList 'No conversations' (already in row 14 — verify), Thread 'Select a conversation' (gray circle +   MessageSquare + title + subtitle), Dashboard pre-data state for stat cards ('No data yet — connect a location'),   History tab 'No prior conversations'.
• Error states: failed message send (red exclamation + retry button on the bubble), expired token banner on /settings/locations   for any location with status='token_expired', Pusher disconnect banner sticky at top of conversations page with reconnect   countdown.
Use lucide icons consistently. All error messages mention the action the user can take.

---

## Row 25 — Production cutover

**Phase**: 5 — Deploy & Test  
**Depends on**: all prior

**Description**: Flip from preview-on-Vercel (already running since row 2) to production. Production env vars, production HighLevel marketplace app config, cron schedule, and final smoke check.

### Claude Code prompt

Vercel is already running previews from row 2 — this row flips the switches to production.

1. **Production env vars**: in Vercel project settings, populate the Production scope (separate from Preview) with final    values: production Neon connection string (auto via Neon-Vercel integration), production Clerk keys (use Clerk's    'Production' instance, not the dev instance you've been using), production Pusher app keys (create a separate Pusher    app — dev and prod must not share an app), and a **freshly generated** ENCRYPTION_KEY (don't reuse dev's — rotate at    cutover).
2. **Production HighLevel marketplace app**: best practice is two marketplace apps — the 'dev' one you've been using    (points at preview URLs) and a new 'prod' one. Create the prod app with its own client_id / client_secret. Set its    redirect URI to `https://{prod-domain}/api/oauth/callback`. Update GHL_CLIENT_ID, GHL_CLIENT_SECRET, GHL_REDIRECT_URI    in Vercel **Production** to point at the prod app. Leave Preview env vars pointing at the dev app.
3. **Production webhook**: in the prod marketplace app, register webhook URL `https://{prod-domain}/api/webhooks/ghl`.    Subscribe events: InboundMessage, OutboundMessage, ConversationUnreadUpdate. Copy webhook secret to    GHL_WEBHOOK_SECRET (Production scope).
4. **Cron schedule**: add to `vercel.json`:
   `{ "crons": [{ "path": "/api/cron/unsnooze", "schedule": "*/5 * * * *" }], "functions": { "src/app/api/webhooks/ghl/route.ts": { "maxDuration": 30 } } }`. Confirm    the cron appears in Vercel dashboard → Cron Jobs.
5. **Promote to production**: merge the current branch to `main` — that triggers a production deploy.
6. **Production smoke check**: sign up via Clerk (real production instance), connect one HighLevel location via OAuth,    send one inbound WhatsApp message, verify it appears in <5 seconds, reply to it, verify delivery on the phone. If this    passes, you're cleared for the full acceptance test in row 26.
7. **Documentation**: add CHECKLIST.md confirming every env var is set in Production scope (not just Preview).    Add a 'How to deploy' section to README.md.

---

## Row 26 — End-to-end smoke test with 3 WhatsApp numbers

**Phase**: 5 — Deploy & Test  
**Depends on**: all prior

**Description**: Final acceptance test. The MVP is done when all 10 of these checks pass against 3 real HighLevel sub-accounts.

### Claude Code prompt

Manually run the acceptance test with 3 real HighLevel sub-accounts, each provisioned with a WhatsApp number. Record results in `TESTING.md`. Checklist:
1. Sign up via Clerk on the production URL, land on dashboard. ✅
2. Navigate to /settings/locations, connect 3 HL locations via OAuth. Banner clears when 3rd is connected. ✅
3. From 3 different phones, send a WhatsApp message to each connected number. All 3 conversations appear in the conversation    list within 5 seconds of send. Channel rail badge for WhatsApp shows 3. ✅
4. Click each conversation: thread loads in <1s, unread count zeroes, sidebar Conversations badge decrements. ✅
5. Reply to each conversation. Bubble appears instantly (optimistic). Single check → double check within 2s. WhatsApp on the phone    receives the message. ✅
6. Send a 2nd reply with an image attachment (use file picker). Image renders in thread. ✅
7. Assign one conversation to a second team member (create a 2nd user). Sign in as user 2 in an incognito window — they see the    assignment via Pusher without refreshing. ✅
8. Snooze one conversation for 1 hour. It moves to the Snoozed tab. Manually update `snoozedUntil` to past in DB and wait for cron —    it auto-reopens with a system message. ✅
9. Resolve one conversation. It moves to Closed tab. Press ⌘Z within 10s — it reopens. ✅
10. 24h window: in DB, manually set one conversation's `lastInboundAt` to 25 hours ago. Reload — composer is disabled, amber template     banner shows, 'Choose template' opens the placeholder dialog. ✅
Log every bug found with reproduction steps. Don't mark MVP done until all 10 pass.

---
