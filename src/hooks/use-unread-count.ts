"use client";

import { useChannelCounts } from "@/hooks/use-channel-counts";

/**
 * Total unread across the workspace, used by the sidebar Conversations badge.
 *
 * Row 6 shipped a `return 0` stub; Row 13 replaces it with a TanStack
 * Query against /api/channel-counts. Pusher invalidation here is set to
 * null — the sidebar is rendered above the locations context, so we
 * pass a static query and let the polling-on-focus + the conversation
 * page's own pusher invalidations keep this fresh in practice.
 *
 * (When the user is actively in /conversations, the rail's
 * useChannelCounts subscribes to private-location-{id} and invalidates
 * the SAME query key, so this hook sees the update for free.)
 */
export function useUnreadCount(): number {
  const { counts } = useChannelCounts("all", null);
  return counts.all;
}
