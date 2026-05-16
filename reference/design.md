# Unified Customer Service Platform — UI Design Brief

A frontend for a multi-channel customer service inbox aggregating WhatsApp, Facebook Messenger, Instagram, TikTok, LinkedIn, Webchat, Email, and SMS into one workspace. Two screens: **Dashboard** (analytics) and **Conversations** (messaging interface).

## Reference images (attached)
- `amaive-dashboard.jpg` — visual reference for dashboard layout, gradient stat cards, sidebar style, and overall information density.
- `communications-hub.svg` — color palette source (primary green `#068B78`) and the channel-icon-with-notification-badge pattern.

> Use the references for **layout and visual language**, not literal copy. Replace travel-industry metrics with customer-service metrics.

---

## 1. Tech stack & constraints

- **Framework:** Next.js 14+ (App Router) with React Server Components where possible.
- **Styling:** Tailwind CSS + shadcn/ui as the base component library.
- **Charts:** Recharts (preferred) or Tremor.
- **Icons:** Lucide React.
- **State:** TanStack Query for server state; Zustand for ephemeral UI state.
- **Real-time:** subscribe to Pusher channels (a `conversations` channel and per-conversation channels) — assume a `usePusher(channel, event)` hook exists.
- **Backend:** HighLevel API V2 via a thin BFF (`/api/*` routes). Assume normalized API shapes — don't write API calls inline; define types and use hook stubs (`useConversations`, `useConversation`, `useStats`, `useChannels`).
- **No native WhatsApp/Twilio integration in frontend** — everything routes through the BFF.

---

## 2. Design system

### Colors
| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#068B78` | Brand teal-green (from comms-hub SVG). Active states, primary CTAs, send button. |
| `--primary-hover` | `#057266` | Hover state for primary. |
| `--sidebar-bg` | `#1A1F2E` | Dark sidebar background (Amaive-style). |
| `--sidebar-active` | `#2A3142` | Active nav item background. |
| `--sidebar-text` | `#A8B0C0` | Inactive nav text. |
| `--sidebar-text-active` | `#FFFFFF` | Active nav text. |
| `--canvas` | `#F5F7FA` | Main content background. |
| `--surface` | `#FFFFFF` | Card surface. |
| `--border` | `#E2E8F1` | Card borders, dividers. |
| `--text-primary` | `#1A1F2E` | Body text. |
| `--text-secondary` | `#6B7280` | Meta text, timestamps. |
| `--unread-badge` | `#D4325A` | Notification badge red (from SVG). |
| `--success` | `#10B981` | Resolved, online indicators. |
| `--warning` | `#F59E0B` | Snoozed, pending. |
| `--danger` | `#EF4444` | Errors, escalations. |

### Stat-card gradients (mirror Amaive's 4 cards)
| Card | Gradient |
|---|---|
| Total Messages | `from-[#4F8BFF] to-[#6FA8FF]` (blue) |
| Unread | `from-[#FF6B8A] to-[#FF8DA8]` (pink/red) |
| Active Conversations | `from-[#FF9A4C] to-[#FFB870]` (orange) |
| Resolved Today | `from-[#8B5CF6] to-[#A78BFA]` (purple) |

### Channel brand colors (badge dots in conversation list)
| Channel | Color |
|---|---|
| WhatsApp | `#25D366` |
| Messenger | `#0084FF` |
| Instagram | gradient `#F58529 → #DD2A7B → #8134AF` |
| TikTok | `#000000` (with cyan/red accent) |
| LinkedIn | `#0A66C2` |
| Webchat | `#068B78` (brand) |
| `#F97316` | |
| SMS | `#8862C8` |

### Typography
- **Font:** Inter (system fallback).
- **Scale:** `xs 12 / sm 14 / base 15 / lg 17 / xl 20 / 2xl 24 / 3xl 32`.
- Stat-card numbers: `text-4xl font-bold` (mirror Amaive's "93", "1450" treatment).

### Spacing & radius
- Card radius: `rounded-xl` (12px).
- Stat card radius: `rounded-2xl` (16px).
- Default padding inside cards: `p-5` or `p-6`.
- Generous gaps between dashboard widgets: `gap-5`.

### Elevation
- Cards: `shadow-sm` on default, `shadow-md` on hover for interactive cards.
- Sidebar: no shadow (flat dark surface).

---

## 3. Global layout

```
┌────────┬──────────────────────────────────────────────────────┐
│        │  Top bar: search · channel filter · notifs · user    │
│  Side  ├──────────────────────────────────────────────────────┤
│  bar   │                                                      │
│        │  Page content (Dashboard OR Conversations)           │
│        │                                                      │
└────────┴──────────────────────────────────────────────────────┘
```

### Sidebar (dark, ~80px collapsed, ~240px expanded)
Items (Lucide icons + label):
- LayoutDashboard — Dashboard
- MessageSquare — **Conversations** (with total-unread badge)
- Users — Contacts
- Inbox — Broadcasts
- BarChart3 — Reports
- Settings — Settings
- *(bottom)* User avatar + name

Expand/collapse toggle at top. Active item: lighter background block + green left accent bar (3px, `--primary`).

### Top bar (60px)
- Global search (left, ~400px wide).
- Channel quick-filter chips (center, optional — see § 5.1).
- Notification bell with red badge.
- User avatar dropdown.

---

## 4. Dashboard screen

Mirror Amaive's layout density and rhythm. Replace the 4 travel cards with **4 messaging stat cards**, keep the same proportions.

### 4.1 Row 1 — Stat cards (4 columns, equal width)
Each card has the gradient from the design system, white text, and matches Amaive's structure:
- **Title** (top-left, `text-sm font-medium opacity-90`)
- **Big number** (center-left, `text-5xl font-bold`)
- **Icon** (top-right, white, 24px) — MessageSquare / MailOpen / MessagesSquare / CheckCircle2
- **Split row at bottom** (two values separated by a thin vertical divider, mimicking Amaive's "Approved / Waiting"):

| Card | Big number | Bottom-left | Bottom-right |
|---|---|---|---|
| Total Messages | `1,847` | `1,290` Inbound | `557` Outbound |
| Unread | `42` | `28` Assigned | `14` Unassigned |
| Active Conversations | `186` | `142` Open | `44` Snoozed |
| Resolved Today | `73` | `68` Resolved | `5` Escalated |

Subtle white progress bar at the bottom of each card showing the ratio between the two split values (1px tall, 70% opacity).

### 4.2 Row 2 — Two equal cards
**Left: Message Volume (Bar Chart)**
- Title bar with "Bar Chart" → rename to **"Message Volume"**.
- Right of title: dropdown `[Week ▾]` + gear icon.
- Grouped bar chart: each day Mon–Sun, two bars per day: **Inbound** (`--primary`) vs **Outbound** (light blue `#6FA8FF`).
- Legend below: colored dots + labels.

**Right: Response Trend (Line/Area Chart)**
- Title: **"Avg Response Time"**.
- Right: `[Year ▾]` + gear.
- Area chart with smooth curve, months on x-axis (JAN–DEC), minutes on y-axis.
- Highlight a single data point with a tooltip pill showing the value (mimic the `$200` pill in Amaive but show e.g. `8m 32s`).
- Fill under curve: `--primary` at 15% opacity.

### 4.3 Row 3 — Wide card "Activity by Channel"
Mirror Amaive's "Activity user chart" with world map:
- Title: **"Activity by Channel"** + toggle `[Volume / Response Time]` (replaces Users/Orders).
- Right side: `[Week ▾]` + gear.
- **Two-column layout inside the card:**
  - **Left (2/3 width):** stylized dotted world map (use a free SVG world map) with bubble circles plotted on country centroids. Bubble size = volume. Bubble color cycles through channel palette. Hover tooltip: `Country · Channel · Count · %`.
  - **Right (1/3 width):** "Details" list with horizontal bars showing top regions, mirroring Amaive's "Russia 50% / North America 20% / Africa 15% / Europe 15%" but for **top channels by volume**:
    - WhatsApp · 52% (green bar)
    - Instagram · 23% (pink bar)
    - Webchat · 14% (teal bar)
    - Messenger · 8% (blue bar)
    - Other · 3% (gray bar)

### 4.4 Row 4 — Three equal cards
**Left: Agent Performance (Progress Bars)**
- Title: **"Agent Performance"** + `[Week ▾]`.
- 5–6 rows of horizontal progress bars (mirror Amaive's "Standart Plans / Premium Plans / etc."). Each row = an agent:
  - Avatar + name (left)
  - Horizontal bar (teal-green for primary, mix in pink for second metric like Amaive)
  - Numeric value on the right (e.g. response time, resolution count)
- Two metrics overlaid as in Amaive: primary bar = conversations handled, secondary bar = avg response time.

**Center: Channel Mix (Donut Chart)**
- Title: **"Channel Mix"** + `[Week ▾]`.
- Donut chart with center text: total convo count (e.g. `186`) — mirror Amaive's "50" treatment, big and bold.
- Legend below with colored dots and values:
  - WhatsApp · 98
  - Instagram · 43
  - Webchat · 26
  - Messenger · 15
  - Other · 4

**Right: Latest Activity (Feed)**
- Title: **"Latest Activity"** + `[Week ▾]`.
- Vertical feed list, ~6 items, mirroring Amaive's structure:
  - Small colored channel dot (left)
  - **Bold title** (e.g. "New WhatsApp from Maria Lopez")
  - Gray subtitle (e.g. "Order #4521 — needs refund info")
  - Timestamp pill on the right (`Just now` / `Today` / `Tomorrow` style)
- Clicking a row navigates to that conversation.

---

## 5. Conversations screen (messaging interface)

Three-pane WhatsApp-Web-style layout. **Critical UX goal:** switching between channels and chats must be one click and visually unmistakable.

```
┌───┬──────┬─────────────────┬───────────────────────┬──────────┐
│ S │ Ch   │ Conversation    │ Active conversation   │ Contact  │
│ i │ rail │ list            │ thread                │ panel    │
│ d │      │                 │                       │ (toggle) │
│ e │      │                 │                       │          │
└───┴──────┴─────────────────┴───────────────────────┴──────────┘
 80    72         320                 flex                 360
```

### 5.1 Channel rail (72px wide, between sidebar and convo list)

Vertical stack of channel icons — this is the **direct visual quote from `communications-hub.svg`**: each channel is a rounded-square white tile with the channel's brand icon, and a **red circular notification badge** (top-right of tile) showing unread count.

- **All** tile at top (chat bubbles icon, shows total unread).
- WhatsApp · Messenger · Instagram · TikTok · LinkedIn · Webchat · Email · SMS — in that order.
- Active channel: 3px green left accent bar + slight scale-up + subtle shadow.
- Hover: tile lifts (`shadow-md`), tooltip shows channel name.
- Tile dimensions: `56x56`, `rounded-2xl`, `bg-white`, `shadow-sm`.
- Badge: `bg-[#D4325A] text-white text-[10px] font-bold` in a 18px circle at `-top-1 -right-1`.

### 5.2 Conversation list (320px)

**Header (sticky):**
- Search input (full-width, `Search conversations...`, with magnifier icon).
- Filter row: 3 segmented tabs — `Open · Snoozed · Closed`.
- Sort dropdown (small, right-aligned): `Newest · Oldest · Unread first · Priority`.

**List items (each ~80px tall):**
- Avatar (40px, with channel-color ring — green ring for WhatsApp, etc.).
- Channel dot indicator on avatar (bottom-right, 12px circle with brand color).
- **Contact name** (bold, truncate).
- Last message preview (gray, single line, truncate).
- Timestamp (top-right, small gray).
- Unread bubble (bottom-right, brand green `#068B78`, white text, e.g. `3`).
- Assignment badge (small chip below preview if assigned: avatar + agent first name).
- **Active conversation:** light teal background `#068B78/8%` + 3px green left accent.
- **Unread:** contact name and preview slightly bolder.

Empty state: friendly illustration + "No conversations in this view".

### 5.3 Active conversation thread (flex / remainder)

**Header (sticky, ~64px):**
- Contact avatar + name + channel badge.
- Online indicator (green dot) if applicable.
- Subline: phone/handle/email + last-seen time.
- Right side: action icons — Assign, Snooze, Tag, Resolve, More (⋯).

**Message canvas:**
- WhatsApp-like bubbles:
  - **Inbound** (from contact): left-aligned, white bubble, `rounded-2xl` with `rounded-bl-sm` on the corner closest to avatar.
  - **Outbound** (from agent): right-aligned, brand-green bubble `#DCF8C6`-style but use `#E1F5F0` (teal-tinted), `rounded-2xl` with `rounded-br-sm`. Sender name above bubble in small gray ("via WhatsApp · Sara").
  - Read receipts: double check, blue if read (WhatsApp parity).
  - Timestamps inside bubble, bottom-right, 10px gray.
- Date dividers: pill in center ("Today", "Yesterday", "Mon, 12 May").
- Media: image thumbnails inline, click to lightbox. PDFs/files: file-card with icon + filename + size.
- System events: centered gray text ("Sara assigned this conversation to Tom").

**Composer (bottom, ~120px):**
- Channel indicator above input: "Replying via WhatsApp" with channel icon — colored pill that **matches the channel of the conversation** (helps prevent reply-to-wrong-channel errors).
- If the channel has a 24h template window restriction (WhatsApp), show an amber notice when expired: "Outside 24h window — use a template" with a "Choose template" button.
- Attachment icon (paperclip), emoji picker, templates/snippets icon, GIF icon.
- Multi-line input, auto-grow up to 6 lines.
- **Send button:** brand green circle (`#068B78`), white paper-plane icon, right side. Disabled state if no text.
- Keyboard hint: "⏎ Send · Shift+⏎ New line".

### 5.4 Contact panel (360px, collapsible)

Tabs: `Contact · Notes · History`.

**Contact tab:**
- Large avatar + name + verified-tick if applicable.
- All channel handles for this contact (WhatsApp number, IG handle, email…) — clicking switches conversation to that channel.
- Tags (colored pills, editable).
- Custom fields (key-value list from HighLevel custom fields).
- Assignment: dropdown of agents/teams.
- Quick actions: Block, Merge, Export.

**Notes tab:** internal-only notes timeline (yellow-tinted background to distinguish from messages), with @mentions.

**History tab:** prior conversations with this contact across channels, chronological.

---

## 6. Interaction details

- **Channel switching:** clicking a channel rail tile filters the conversation list to that channel. The current open chat stays visible if it matches; otherwise the thread area shows the empty state ("Select a conversation").
- **Real-time:** new inbound message → conversation jumps to top of list + count badge animates + soft chime (toggle in settings).
- **Optimistic sends:** outbound bubble appears immediately with a single gray check; updates to double check on server ack; red exclamation + retry on failure.
- **Keyboard shortcuts:**
  - `J / K` — next / previous conversation.
  - `E` — resolve.
  - `S` — snooze (opens snooze menu).
  - `A` — assign (opens agent picker).
  - `/` — focus search.
  - `Cmd/Ctrl + Enter` — send.
- **Empty states:** friendly illustrations + clear primary action.
- **Loading:** skeleton screens (no spinners on the main panes).

---

## 7. States to implement

For every interactive element: default · hover · focus · active · disabled · loading.
For data: loading skeleton · empty · error (with retry) · success.

---

## 8. Responsive behavior

- **Desktop (≥1280):** full 5-column layout.
- **Tablet (768–1279):** contact panel auto-collapses; toggle to reveal.
- **Mobile (<768):** stacks. Channel rail becomes a horizontal scroller below the top bar. Conversation list and thread are separate views with back navigation.

---

## 9. Accessibility

- All interactive elements keyboard-reachable, focus rings visible (2px `--primary` outline at 2px offset).
- Color contrast AA minimum for all text.
- Channel badges include a screen-reader label ("WhatsApp, 3 unread").
- ARIA live region for incoming messages.
- Don't rely solely on color — pair channel colors with icons.

---

## 10. Deliverables for this design pass

1. `app/(dashboard)/dashboard/page.tsx` — Dashboard screen with the 4 stat cards, 2 charts, channel activity card, agent performance, channel mix donut, latest activity feed. Use realistic mock data.
2. `app/(dashboard)/conversations/page.tsx` — Conversations screen with channel rail, conversation list, thread, and contact panel. Use realistic mock data for 5 channels, ~15 conversations, varying read/unread/assigned states.
3. `components/` — reusable components: `StatCard`, `ChannelRailItem`, `ConversationListItem`, `MessageBubble`, `Composer`, `ContactPanel`, `ChartCard`.
4. `lib/mock-data.ts` — typed mock data matching the expected HighLevel API shapes (so it can be swapped for live data later).
5. Use shadcn/ui primitives (`Button`, `Input`, `Avatar`, `Tabs`, `DropdownMenu`, `Tooltip`, `Badge`, `ScrollArea`, `Separator`) where they fit.
6. No external icon packs other than Lucide.
7. Match the Amaive reference for **density and rhythm**, the comms-hub SVG for **color and channel-badge pattern**, and standard WhatsApp Web for the **messaging thread**.

Build the dashboard and conversations screen as a working prototype I can click through.
