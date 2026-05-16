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
| Production | `https://{project}.vercel.app` |
| Preview | `https://{project}-git-{branch}.vercel.app` |

The production URL is what gets registered with the HighLevel marketplace app at row 25 (production cutover). Preview URLs are used for OAuth + webhook development from row 7 onward.

## CI

`.github/workflows/ci.yml` runs `pnpm typecheck` and `pnpm lint` on every PR and push to `main`. Mark both as required checks on `main` once the first PR has reported them.
