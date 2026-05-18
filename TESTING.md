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

- [ ] Sign-up email arrives
- [ ] Lands on `/dashboard` after verify
- [ ] Stat cards render (numbers may be 0 until conversations arrive)

**Date / observations:**

## 2 · Connect 3 HL locations via OAuth

Navigate to `/settings/locations`, click **Connect HighLevel** three times — once per sub-account.

- [ ] OAuth handshake completes for all 3 (status `connected`)
- [ ] Yellow "no locations connected" banner clears after the 3rd
- [ ] Each location shows its WhatsApp number

**Date / observations:**

## 3 · Inbound from 3 phones

From 3 different phones, send a WhatsApp message to each connected number.

- [ ] All 3 conversations appear in `/conversations` within **5 seconds**
- [ ] Channel rail's WhatsApp badge reads `3`
- [ ] Each preview shows the inbound message body

**Date / observations:**

## 4 · Open each conversation

Click each row in turn.

- [ ] Thread loads in **<1s**
- [ ] Unread count zeroes on the row
- [ ] Sidebar **Conversations** badge decrements
- [ ] Header shows channel badge + contact info

**Date / observations:**

## 5 · Reply to each conversation

Type a reply and hit Cmd+Enter (or click Send).

- [ ] Outbound bubble appears **instantly** (optimistic)
- [ ] Single check → double check within **2 seconds** (delivered)
- [ ] WhatsApp on the phone receives the message

**Date / observations:**

## 6 · Reply with image attachment

Pick the file-picker icon, attach a PNG/JPG, send.

- [ ] Image renders in thread
- [ ] WhatsApp on phone receives the image

**Date / observations:**

## 7 · Assign + Pusher fan-out across users

Create a 2nd user (sign up in an incognito tab). On the original tab, assign one conversation to user 2.

- [ ] Assignment bubble appears in thread (system message "Assigned to …")
- [ ] In the incognito tab, the assignment appears **without refreshing** (Pusher live)
- [ ] Conversation list row shows new assignee chip

**Date / observations:**

## 8 · Snooze + auto-reopen via cron

Snooze one conversation for 1 hour (press `S`, pick 1 hour).

- [ ] Conversation moves to **Snoozed** tab
- [ ] Force-expire by poking the DB:

  ```
  curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{"conversationId":"<paste conv UUID>","action":"expire-snooze"}' \
    'https://relay-customer-hub.vercel.app/api/admin/test-poke'
  ```
- [ ] Trigger the cron immediately: `gh workflow run unsnooze.yml` (or wait ≤5 min)
- [ ] Conversation auto-reopens with a system message "Snooze expired — conversation reopened"
- [ ] Tab returns to **Open**

**Date / observations:**

## 9 · Resolve + ⌘Z undo

Resolve one conversation (press `E`).

- [ ] Conversation moves to **Closed** tab
- [ ] System message "Resolved by …" appears in thread
- [ ] Press `⌘Z` within 10 seconds → conversation re-opens
- [ ] Closed tab decrements, Open tab increments

**Date / observations:**

## 10 · 24h window closed (composer disabled)

Pick a conversation, age its `lastInboundAt` to 25 hours ago:

```
curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<paste conv UUID>","action":"age-inbound","hours":25}' \
  'https://relay-customer-hub.vercel.app/api/admin/test-poke'
```

Reload `/conversations`.

- [ ] Composer is disabled (input greyed out)
- [ ] Amber banner reads something like "The 24-hour reply window has closed. Use a template."
- [ ] **Choose template** button opens the placeholder dialog

**Date / observations:**

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
