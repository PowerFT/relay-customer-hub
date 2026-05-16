# Relay Customer Hub — Project Bundle

Everything Claude Code needs to build the Relay Customer Hub MVP from scratch.
Drop this folder anywhere, point Claude Code at it, and start building.

## What's inside

| File | Purpose |
|---|---|
| `BUILD_PLAN.md` | The plan in markdown form. **Claude Code reads from this.** 26 sequential rows. |
| `Relay_MVP_Build_Plan.xlsx` | Same plan as a spreadsheet, with phase-colored rows. For your review. |
| `reference/` | Design reference: working HTML/React prototype, design brief, all tokens. Read-only — Claude Code looks at these to match style/layout. |

## Quick start (3 commands)

1. Open a terminal in this folder. In macOS Finder: right-click the folder → "New Terminal at Folder."
2. (Optional but recommended) Initialize git:
   ```bash
   git init && git add . && git commit -m "Initial: plan + design reference"
   ```
3. Start Claude Code:
   ```bash
   claude
   ```

## First prompt for Claude Code

Paste this into Claude Code:

> I'm building the Relay Customer Hub MVP. Please:
>
> 1. Read `./BUILD_PLAN.md`.
> 2. Confirm you can also view `./reference/design.md` and `./reference/styles.css`.
> 3. Execute **Row 1** only, then stop and wait for me to say "continue" before doing Row 2.
> 4. After each row, summarize what you did, list any open questions, and wait.
>
> Do not skip rows. Do not run multiple rows in a single turn unless I explicitly say so.

That's it. Claude Code will work through 26 rows to ship the MVP.

## What gets built

A multi-channel customer service inbox that connects to HighLevel WhatsApp numbers, with two main screens:

- **Dashboard** — live stats (total messages, unread, active, resolved), volume chart, response-time chart, latest activity feed.
- **Conversations** — channel rail + conversation list + thread + contact panel, with real-time updates via Pusher.

### MVP scope

- 3 connected HighLevel sub-accounts (each with its own WhatsApp number)
- Inbound messages appear in <5 seconds
- Reply from the app, delivered to WhatsApp via HighLevel
- Internal notes, assignment, snooze, resolve
- 24-hour WhatsApp window handling (with placeholder template picker)

### Tech stack

Next.js 14 App Router + TypeScript · Tailwind CSS + shadcn/ui · Neon Postgres + Drizzle ORM · Clerk auth · Pusher Channels · Recharts · Vercel hosting · HighLevel Conversations API V2.

### Definition of done

Row 26 of the plan: a 10-point acceptance test against 3 real HighLevel WhatsApp numbers. Don't ship until all 10 pass.

## Why two formats for the plan?

- The **xlsx** is for you. Phase-colored rows, dependency column, separate sheets for tech stack and data model. Open it in Numbers, Excel, or Google Sheets.
- The **markdown** is for Claude Code. Easier for it to parse than xlsx, identical content.

They're generated from the same source. If you want to revise the plan, edit the xlsx through me (Claude.ai) and I'll regenerate both.

## If something goes wrong

- **Claude Code can't find a file**: confirm `./BUILD_PLAN.md` and `./reference/design.md` both exist. If you accidentally started Claude Code in a different folder, `cd` here and re-run `claude`.
- **A row fails or you want to revise**: ask Claude.ai (where this bundle was generated) to update that row's prompt. Bring the new xlsx + md back and re-run from where you left off.
- **You're stuck on HighLevel OAuth**: HighLevel requires the redirect URI to match exactly. The build plan assumes Vercel previews are working (Row 2). If they aren't, OAuth (Row 7) will fail.

## Folder layout after Row 1 runs

After Claude Code finishes Row 1 (project scaffolding), your folder will look like this:

```
relay-customer-hub/
├── BUILD_PLAN.md                  # this plan
├── Relay_MVP_Build_Plan.xlsx      # spreadsheet version
├── README.md                      # (Next.js may overwrite this — fine)
├── reference/                     # design reference (untouched)
├── src/                           # ← new, from Next.js scaffold
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── ...standard Next.js files
```
