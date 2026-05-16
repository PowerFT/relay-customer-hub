"use client";

import PusherClient from "pusher-js";

let cached: PusherClient | null = null;

/**
 * Lazy singleton — one shared connection per browser tab. We don't want
 * the `<ClerkProvider>` re-render or any other React-tree shuffle to
 * cause a new WebSocket handshake.
 */
export function getPusherClient(): PusherClient {
  if (cached) return cached;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    throw new Error(
      "NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER missing — Pusher client cannot init",
    );
  }
  cached = new PusherClient(key, {
    cluster,
    forceTLS: true,
    authEndpoint: "/api/pusher/auth",
  });
  return cached;
}

export function disconnectPusherClient() {
  if (cached) {
    cached.disconnect();
    cached = null;
  }
}
