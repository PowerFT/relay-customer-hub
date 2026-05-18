"use client";

import { useEffect } from "react";

import { getPusherClient } from "@/lib/pusher/client";

/**
 * Subscribe to a Pusher channel for a single event, run a handler when it
 * fires. Re-subscribes if the channel name or event name changes; cleans up
 * on unmount.
 *
 * Pass a stable `handler` reference (useCallback) — we don't want
 * resubscribe-thrash from a new function identity each render.
 */
export function usePusherChannel<T = unknown>(
  channel: string | null,
  event: string,
  handler: (data: T) => void,
) {
  useEffect(() => {
    if (!channel) return;
    const client = getPusherClient();
    const ch = client.subscribe(channel);
    const cb = (data: T) => handler(data);
    ch.bind(event, cb);
    return () => {
      ch.unbind(event, cb);
      client.unsubscribe(channel);
    };
  }, [channel, event, handler]);
}
