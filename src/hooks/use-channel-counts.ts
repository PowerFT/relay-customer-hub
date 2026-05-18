"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";

export type ChannelKey =
  | "all"
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "webchat"
  | "email"
  | "sms";

export type ChannelCounts = Record<ChannelKey, number>;

const EMPTY: ChannelCounts = {
  all: 0,
  whatsapp: 0,
  messenger: 0,
  instagram: 0,
  tiktok: 0,
  linkedin: 0,
  webchat: 0,
  email: 0,
  sms: 0,
};

/**
 * Fetches per-channel unread counts and invalidates whenever the given
 * Pusher channel emits `message:new` or `conversation:updated`.
 *
 * `locationId` is the workspace scope — 'all' or a specific location.
 * `pusherChannel` is the realtime channel to subscribe to (typically
 * `private-location-{locationId}`). Pass `null` to disable realtime
 * sync (e.g. when scoped to 'all' without a single location).
 */
export function useChannelCounts(
  locationId: string | "all",
  pusherChannel: string | null,
  filters?: { agents?: string[]; channels?: string[] },
) {
  const queryClient = useQueryClient();
  const filterKey = useMemo(
    () => `${filters?.agents?.join(",") ?? ""}|${filters?.channels?.join(",") ?? ""}`,
    [filters?.agents, filters?.channels],
  );
  const queryKey = useMemo(
    () => ["channel-counts", locationId, filterKey],
    [locationId, filterKey],
  );

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ChannelCounts> => {
      const params = new URLSearchParams({ locationId });
      if (filters?.agents && filters.agents.length > 0) params.set("agents", filters.agents.join(","));
      if (filters?.channels && filters.channels.length > 0) params.set("channels", filters.channels.join(","));
      const res = await fetch(`/api/channel-counts?${params.toString()}`);
      if (!res.ok) throw new Error(`channel-counts ${res.status}`);
      return res.json();
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  usePusherChannel(pusherChannel, "message:new", invalidate);
  usePusherChannel(pusherChannel, "conversation:updated", invalidate);

  return {
    counts: query.data ?? EMPTY,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
