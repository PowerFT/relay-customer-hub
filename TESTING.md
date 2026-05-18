# Row 26 — End-to-end acceptance test

Manually walk through all 10 checks against the production deploy with 3 real HighLevel sub-accounts, each provisioned with a WhatsApp number. MVP is **not done** until every check passes.

Production URL: **`https://relay-customer-hub.vercel.app`**
Bearer token for admin endpoints: `CRON_SECRET` (also used by GH Actions cron — same value).

## Pre-flight before running

- [ ] Seed wiped, real owner is `iamsampritghosh@gmail.com` (verified via earlier `POST /api/admin/seed` response)
- [ ] No prior `connected` locations in DB (re-OAuth needed after ENCRYPTION_KEY rotation)
- [ ] Bring 3 HL sub-accounts, each with a WhatsApp number
- [ ] Bring 3 phones (or 3 verified WhatsApp accounts) to send inbound from

If you want to start from a totally clean slate first:

```
curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  'https://relay-customer-hub.vercel.app/api/admin/seed?reset=1'
```

(Then re-sign-in to repopulate your user row.)

## Result legend

- `[x]` pass · `[ ]` not yet run · `[✗]` fail (log a bug under the check)

---

## 1 · Sign up + land on dashboard

Sign up via Clerk at `relay-customer-hub.vercel.app`. Land on `/dashboard`.

- [x] Sign-up email arrives
- [x] Lands on `/dashboard` after verify
- [x] Stat cards render (numbers may be 0 until conversations arrive)

**Date / observations:** 2026-05-18 — passed.

## 2 · Connect 3 HL locations via OAuth

Navigate to `/settings/locations`, click **Connect HighLevel** three times — once per sub-account.

- [x] OAuth handshake completes for all 3 (status `connected`)
- [x] Yellow "no locations connected" banner clears after the 3rd
- [x] Each location shows its WhatsApp number

**Date / observations:** 2026-05-18 — passed.

## 3 · Inbound from 3 phones

From 3 different phones, send a WhatsApp message to each connected number.

- [ ] All 3 conversations appear in `/conversations` within **5 seconds**
- [ ] Channel rail's WhatsApp badge reads `3`
- [ ] Each preview shows the inbound message body

**Backend pre-flight (autonomous):** `POST /api/webhooks/ghl` returns `401 {"error":"invalid signature"}` for unsigned bodies — Ed25519 verification path is live. Pusher env vars present in Production scope. The webhook → DB → Pusher → UI fan-out is wired; **the only way to verify end-to-end is to send a real inbound from a real phone.**

**Date / observations:** needs manual run — send WA from 3 phones now.

## 4 · Open each conversation

Click each row in turn.

- [ ] Thread loads in **<1s**
- [ ] Unread count zeroes on the row
- [ ] Sidebar **Conversations** badge decrements
- [ ] Header shows channel badge + contact info

**Backend pre-flight (autonomous):** Thread route + read marker endpoint live; queries are indexed (`conversations_inbox_idx` on `(locationId, status, lastMessageAt DESC)`); pusher channel `conversation:updated` is subscribed by `useChannelCounts` for badge decrement. Frontend timing requires a browser session — please verify.

**Date / observations:** needs manual run — click each of the 3 new conversations after step 3 lands.

## 5 · Reply to each conversation

Type a reply and hit Cmd+Enter (or click Send).

- [ ] Outbound bubble appears **instantly** (optimistic)
- [ ] Single check → double check within **2 seconds** (delivered)
- [ ] WhatsApp on the phone receives the message

**Backend pre-flight (autonomous):** `POST /api/conversations/[id]/messages` is wired through `useSendMessage` with optimistic-cache prepend; HL API call hands status `sent → delivered` via webhook callback. Tests at `src/lib/__tests__/` cover the dedup hardening (Row 23). The optimistic + delivery-tick timing needs a real browser session.

**Date / observations:** needs manual run — reply from the UI to each of the 3 conversations.

## 6 · Reply with image attachment

Pick the file-picker icon, attach a PNG/JPG, send.

- [ ] Image renders in thread
- [ ] WhatsApp on phone receives the image

**Backend pre-flight (autonomous):** Composer's file picker → multipart upload to `/api/conversations/[id]/messages` with attachments; HL message API accepts attachment URLs. Image rendering uses `<img>` with full-size on click. Real file pick is browser-only.

**Date / observations:** needs manual run — attach a PNG/JPG via the paperclip icon in composer.

## 7 · Assign + Pusher fan-out across users

Create a 2nd user (sign up in an incognito tab). On the original tab, assign one conversation to user 2.

- [ ] Assignment bubble appears in thread (system message "Assigned to …")
- [ ] In the incognito tab, the assignment appears **without refreshing** (Pusher live)
- [ ] Conversation list row shows new assignee chip

**Backend pre-flight (autonomous):** `POST /api/conversations/[id]/assign` writes assignee + system message + publishes `conversation:updated` on `private-location-{id}`. `usePusherChannel` subscribes the same channel from the conversations page. Real-time fan-out requires two browser sessions.

**Date / observations:** needs manual run — sign up a 2nd user in incognito, assign from primary tab, watch incognito for the live update.

## 8 · Snooze + auto-reopen via cron

- [x] Conversation can be forced into `snoozed` status with past `snoozedUntil` via `POST /api/admin/test-poke` (action=`expire-snooze`)
- [x] Cron sweeper picks it up — `gh workflow run unsnooze.yml` run #26046778345 returned `{"ok":true,"reopened":1}` (2026-05-18)
- [x] Conversation flipped back to `status=open`, `snoozedUntil=null` (verified via inspect action)
- [ ] Eyeball: thread shows the inserted system message "Snooze expired — conversation reopened" (the cron route does this INSERT — manually open the conversation to confirm UI render)

**Autonomous run:** target convo `22b1a80d-f8ee-49a4-922b-7e18f5cbafc0`. snoozed → cron fired → reopened. Pusher publish events `message:new` + `conversation:updated` were called by the route (the realtime side requires a browser open at the time).

**Date / observations:** 2026-05-18 — backend end-to-end ✅. UI confirmation deferred to your eyeball.

## 9 · Resolve + ⌘Z undo

Resolve one conversation (press `E`).

- [ ] Conversation moves to **Closed** tab
- [ ] System message "Resolved by …" appears in thread
- [ ] Press `⌘Z` within 10 seconds → conversation re-opens
- [ ] Closed tab decrements, Open tab increments

**Backend pre-flight (autonomous):** `POST /api/conversations/[id]/resolve` toggles status + writes system message. The undo UX (10s window with `⌘Z` keyboard listener) is a useResolveActions hook with `useHotkeys`. Cmd+Z keybinding requires a browser to verify.

**Date / observations:** needs manual run — press `E` on an open conversation, then `⌘Z` within 10s.

## 10 · 24h window closed (composer disabled)

- [x] `POST /api/admin/test-poke` (action=`age-inbound`, hours=25) executed against prod (2026-05-18). Target convo `8d1aa524-23eb-4ea8-a5b1-67fbf91bb026`, `lastInboundAt` now reads `2026-05-17T15:37:20Z` (=now-25h).
- [x] Composer logic at `src/components/conversations/composer.tsx:80-95` computes `insideWindow = Date.now() - new Date(lastInboundAt).getTime() < TWENTY_FOUR_HOURS` — with the aged timestamp, this evaluates to `false`, which:
  - swaps the textarea placeholder to "Outside 24-hour window"
  - disables send
  - renders the amber template banner ("Outside the 24-hour window. Choose an approved WhatsApp template to start a new conversation.")
- [ ] Eyeball: open conversation `8d1aa524-23eb-4ea8-a5b1-67fbf91bb026` in `/conversations` and confirm the composer renders as described

**Autonomous run:** target convo `8d1aa524-23eb-4ea8-a5b1-67fbf91bb026`. Backend ✅; UI confirmation deferred to you.

**Date / observations:** 2026-05-18 — backend ✅ + composer logic verified by code review. UI eyeball pending.

---

## Bug log

Record every issue found, even cosmetic. Each entry includes reproduction steps, expected, actual, and a screenshot path if relevant.

### 1. [title]

- **Check step:** N/A or e.g. #5
- **Reproduce:**
- **Expected:**
- **Actual:**
- **Screenshot:**
- **Status:** open / fixed in PR # / wontfix

---

## Sign-off

When **all 10 checks are `[x]`** and the bug log is either empty or resolved, tag the cutover commit:

```
git tag -a v0.1.0-mvp -m "MVP acceptance — Row 26 passed against 3 real HL numbers"
git push origin v0.1.0-mvp
```

Update CHECKLIST.md §7 to mark the v0.1.0-mvp tag step as done.
