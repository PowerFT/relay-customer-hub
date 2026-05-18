# Production cutover checklist

Working through Row 25 of [BUILD_PLAN.md](./BUILD_PLAN.md#row-25--production-cutover). Use this as a live checklist — tick items as they land.

Production URL: **`https://relay-customer-hub.vercel.app`**

## Status legend

- `[x]` shipped, verified
- `[~]` in progress / awaiting external input
- `[ ]` not started

## 0 · Pre-flight

- [x] Main branch deploys to production automatically (Vercel)
- [x] Seed data populated for demo: `pnpm db:seed` (or `POST /api/admin/seed`)
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green locally

## 1 · Production env vars (Vercel → Production scope)

Each row below is one Vercel env var set in **Production scope only** (Preview keeps pointing at the dev instances).

| Var | Source | Status |
|---|---|---|
| `DATABASE_URL` | Neon prod branch (auto via Vercel-Neon integration) | [x] |
| `DATABASE_URL_UNPOOLED` | same | [x] |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → Production instance (not `pk_test_*`) | [ ] |
| `CLERK_SECRET_KEY` | Clerk → Production instance (not `sk_test_*`) | [ ] |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → Production endpoint signing secret | [ ] |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | [x] |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | [x] |
| `PUSHER_APP_ID` | Pusher → **new prod app** (not the dev app) | [ ] |
| `PUSHER_KEY` | same | [ ] |
| `PUSHER_SECRET` | same | [ ] |
| `PUSHER_CLUSTER` | same | [ ] |
| `NEXT_PUBLIC_PUSHER_KEY` | same | [ ] |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | same | [ ] |
| `GHL_CLIENT_ID` | HighLevel → **new prod marketplace app** | [ ] |
| `GHL_CLIENT_SECRET` | same | [ ] |
| `GHL_REDIRECT_URI` | `https://relay-customer-hub.vercel.app/api/oauth/callback` | [ ] |
| `OAUTH_STATE_SECRET` | `openssl rand -hex 32` (fresh per env) | [ ] |
| `ENCRYPTION_KEY` | **FRESH for production** — rotate at cutover. See generated value below. | [ ] |
| `CRON_SECRET` | already set; reuse for prod | [x] |

### Fresh production `ENCRYPTION_KEY` (generated for this cutover)

```
ENCRYPTION_KEY=2f6d1ec9d4c0456437d73f002d9ccd8215021a9d8204149128d6e776c4fbdc43
```

Set this in Vercel **Production scope only**. Do not reuse the dev value — encrypted OAuth tokens stay tied to the env that wrote them.

## 2 · External services (you do this; I can't)

These three accounts each need a separate "prod" instance from the dev one you've been testing with:

### 2.1 Clerk production instance
1. Clerk dashboard → **+ Add Application** (or promote an existing one to production)
2. Connect your real domain (`relay-customer-hub.vercel.app`) or use the auto-generated `*.clerk.accounts.dev`
3. Configure sign-in methods (email + Google, etc.)
4. Webhook endpoint: `https://relay-customer-hub.vercel.app/api/webhooks/clerk` — subscribe `user.created`, `user.updated`
5. Copy the **Publishable Key**, **Secret Key**, and **Webhook Signing Secret** → paste into Vercel env vars above
6. Warning: switching to prod Clerk means dev `*@example.com` users won't work. Confirm you have a real account before flipping.

### 2.2 Pusher production app
1. Pusher dashboard → **+ Create App** (separate from dev)
2. Cluster: pick closest to your users (e.g. `eu`, `us2`)
3. Enable client events
4. Copy `app_id`, `key`, `secret`, `cluster` → paste into Vercel env vars above

### 2.3 HighLevel production marketplace app
1. HighLevel marketplace dashboard → **+ Create App** (separate from dev)
2. Scopes: same as dev — `conversations/message.write`, `conversations.write`, `contacts.write`, `locations.readonly`
3. Redirect URI: `https://relay-customer-hub.vercel.app/api/oauth/callback`
4. Webhook URL: `https://relay-customer-hub.vercel.app/api/webhooks/ghl`, subscribe `InboundMessage`, `OutboundMessage`, `ConversationUnreadUpdate`
5. Copy `client_id`, `client_secret` → paste into Vercel env vars above

## 3 · Cron schedule

Vercel Hobby caps native crons at once-daily, so we drive `/api/cron/unsnooze` from GitHub Actions every 5 minutes.

- [x] `.github/workflows/unsnooze.yml` — schedule + workflow_dispatch
- [x] `CRON_SECRET` set in repo secrets + Vercel Production scope
- [x] First scheduled run green (verified May 18, 2026)

## 4 · Pre-cutover sanity

- [x] `/api/cron/unsnooze` accepts POST with bearer auth
- [x] `/api/admin/seed` exists for demo refresh (gated by `CRON_SECRET`)
- [ ] `pnpm db:push` to ensure `locations.display_name` (and any later schema drift) is applied to prod DB. The seed runner self-heals this column via `ALTER TABLE ... IF NOT EXISTS`, so this step is optional unless other schema changes accumulate.
- [ ] Confirm `/conversations` and `/dashboard` load with seeded data when you're signed in as the prod Clerk user

## 5 · Promote to production

Already happening — every merge to `main` triggers a Vercel production deploy. After step 1 + step 2 are complete, the **next** push to main will run against the prod credentials.

- [ ] Push a no-op commit (or merge a docs PR) to trigger a clean production build with new env vars
- [ ] Confirm `https://relay-customer-hub.vercel.app` returns 200 and signs you in via prod Clerk

## 6 · Smoke check (run after step 5)

End-to-end flow against the real production stack:

- [ ] Sign up via Clerk on `relay-customer-hub.vercel.app` (prod instance)
- [ ] Land on `/dashboard`
- [ ] Connect one HighLevel location via OAuth (`/settings/locations` → Connect HighLevel)
- [ ] Banner clears, location appears
- [ ] From a real phone, send a WhatsApp message to the connected number
- [ ] Conversation appears in the inbox within 5 seconds (Pusher fan-out)
- [ ] Reply from the UI; the message arrives on the phone within 5 seconds (HighLevel API)

If all 7 pass, you're cleared for the full acceptance test in Row 26.

## 7 · Post-cutover hygiene

- [ ] Remove `/api/admin/seed` (or hide it behind an env flag) — it's bearer-gated but the demo data step is over
- [ ] Update README "How to deploy" section (done in this PR)
- [ ] Tag the cutover commit: `git tag v0.1.0-mvp && git push --tags`
