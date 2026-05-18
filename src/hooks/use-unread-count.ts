"use client";

/**
 * Returns total unread conversation count across all locations the current
 * user has access to. Row 13 will replace this with a Pusher-backed
 * TanStack Query subscribed to /api/channel-counts.
 */
export function useUnreadCount(): number {
  return 0;
}
