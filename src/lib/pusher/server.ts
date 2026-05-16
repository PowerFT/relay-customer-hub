/**
 * Pusher server-side publishing seam.
 *
 * Row 10 calls publish() from the GHL webhook handler. Row 11 will replace
 * this stub with a real `new Pusher({...})` client once the Pusher account
 * is provisioned and PUSHER_* env vars are set.
 *
 * Until then, publish() logs structured events to stdout — the webhook
 * handler still runs end-to-end (verify, persist, dedup) and we can see
 * what would have been broadcast in Vercel logs.
 */

type PusherPayload = Record<string, unknown> | unknown[] | string | number | boolean | null;

export async function publish(
  channel: string,
  event: string,
  data: PusherPayload,
): Promise<void> {
  // Structured single-line log so it's grep-friendly in Vercel.
  console.log(JSON.stringify({ pusher: "stub", channel, event, data }));
}
