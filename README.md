# Relay Customer Hub

Multi-channel customer service inbox. MVP scope: connect 3 HighLevel WhatsApp numbers, receive inbound + send outbound through a real-time Dashboard and Conversations UI.

Build plan lives in [`BUILD_PLAN.md`](./BUILD_PLAN.md). Design reference in [`reference/`](./reference/).

## Tech stack

Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui · Neon Postgres + Drizzle ORM · Clerk auth · Pusher Channels · Recharts · Vercel hosting · HighLevel Conversations API V2.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # next build
```

Copy `.env.example` to `.env.local` and fill in values as each build-plan row introduces them. The very first row needing real secrets is row 5 (Clerk).

## Deployment

Every commit to a branch produces a Vercel preview deploy. `main` deploys to production.

| Scope | URL pattern |
|---|---|
| Production | `https://relay-customer-hub.vercel.app` |
| Preview | `https://relay-customer-hub-git-{branch}-powerfts-projects.vercel.app` |

### How to deploy a feature

1. Open a PR against `main`. The Vercel bot posts a preview URL on the PR.
2. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` locally and confirm green.
3. Squash-merge to `main`. The push triggers a production deploy.
4. Confirm the new alias on `relay-customer-hub.vercel.app` by running `vercel inspect <prod-url>` and checking the `created` timestamp.

### Production cutover (one-time)

See **[CHECKLIST.md](./CHECKLIST.md)** for the full Row 25 cutover playbook — env var setup, the three external marketplace apps (Clerk, Pusher, HighLevel) you must create, smoke test, and tagging.

### Cron

`/api/cron/unsnooze` is invoked every 5 minutes by **GitHub Actions** (`.github/workflows/unsnooze.yml`) because Vercel Hobby caps native crons at once-daily. Auth: `Authorization: Bearer ${CRON_SECRET}`. Manual dispatch via `gh workflow run unsnooze.yml`.

### Demo seed

`pnpm db:seed` (local, requires `DATABASE_URL`) or `POST /api/admin/seed` (against the live deploy, bearer-gated by `CRON_SECRET`) writes a deterministic set of 6 agents · 4 locations · 32 conversations distributed by agent/channel affinity. Idempotent: re-running wipes prior seeded rows and reinserts. Remove the admin endpoint before going public to outside customers (see CHECKLIST.md §7).

## CI

`.github/workflows/ci.yml` runs `pnpm typecheck` and `pnpm lint` on every PR and push to `main`. Mark both as required checks on `main` once the first PR has reported them.
