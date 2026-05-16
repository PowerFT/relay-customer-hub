import Pusher from "pusher";

/**
 * Server-side Pusher client.
 *
 * Row 10 shipped a console.log stub at this path so the webhook handler
 * could be tested end-to-end without a real account. Row 11 replaces it
 * with the real client — the handler's `publish(channel, event, data)`
 * call signature is unchanged.
 */

let cached: Pusher | null = null;

function getPusher(): Pusher {
  if (cached) return cached;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    throw new Error(
      "Pusher env vars missing: PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER",
    );
  }
  cached = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return cached;
}

export type PusherPayload =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

const MAX_RETRIES = 2;

/**
 * Publish to a single channel. Retries up to 2 times on transient failures
 * (rate-limit, network blip). Never throws — webhook handlers and server
 * actions don't want a fan-out failure to surface as user-visible error.
 */
export async function publish(
  channel: string,
  event: string,
  data: PusherPayload,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await getPusher().trigger(channel, event, data);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      }
    }
  }
  console.error("pusher publish failed after retries", { channel, event, err: lastErr });
}

/** Used by the channel auth route to sign private channel subscriptions. */
export function authorizeChannel(socketId: string, channel: string) {
  return getPusher().authorizeChannel(socketId, channel);
}
