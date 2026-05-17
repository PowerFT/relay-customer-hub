# TODO

## ✅ Done

- Neon provisioned + Row 4 verified (7 tables + 2 indexes live).
- Clerk env vars (publishable, secret, webhook, sign-in/up URLs) — Production + Preview.
- HighLevel marketplace app credentials (client id, client secret, redirect URI, encryption key, OAuth state secret) — Production + Preview.
- Pusher Channels keys (`PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` + `NEXT_PUBLIC_PUSHER_*` mirrors) — Production + Preview.
- `CRON_SECRET` set in Production + Preview, synced to `.env.local`.
- **HighLevel webhook endpoint registered** at `https://relay-customer-hub.vercel.app/api/webhooks/ghl` with `InboundMessage` / `OutboundMessage` / `ConversationUnreadUpdate` subscribed. Signature verification handled in-app via Ed25519/RSA — no shared secret needed (the `GHL_WEBHOOK_SECRET` env var is dormant; kept in `.env.example` as legacy).
- **Vercel Deployment Protection disabled** — public previews enabled. HL webhooks can now deliver to preview branches.

## Pending

### 1. Main branch protection (recommended)

GitHub → repo settings → **Branches** → add rule for `main`:
- Require status check `check` (the job in `.github/workflows/ci.yml`) before merge.
- Require pull request reviews before merging (optional but advisable).

### 2. Merge `chore/root-redirect` PR

Branch pushed; replaces the create-next-app starter at `/` with a server-component `redirect("/dashboard")`. CI runs `pnpm typecheck` + `pnpm lint` — both pass locally.

https://github.com/PowerFT/relay-customer-hub/pull/new/chore/root-redirect

## Out of scope (build plan, not yet started)

- **Row 25 — Production cutover.** Needs the production HL marketplace app (separate from current dev one), production Clerk keys, fresh `ENCRYPTION_KEY` rotation, prod webhook URL.
- **Row 26 — End-to-end smoke test.** Manual; requires 3 physical phones with the connected WhatsApp numbers.

## Row branches awaiting review

Rows 3–24 are on individual branches off `main`, each chaining its dep branches in. Merge in row-number order. The full list lives in CHECKPOINT.md on `row-4-database-schema`.
