"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MessageSquare, PanelRightOpen } from "lucide-react";

import { ChannelRail } from "@/components/conversations/channel-rail";
import { ContactPanel } from "@/components/conversations/contact-panel";
import { ConversationList } from "@/components/conversations/conversation-list";
import { PusherStatusBanner } from "@/components/conversations/pusher-status-banner";
import { Thread } from "@/components/conversations/thread";
import {
  DashboardFiltersBar,
  type FilterValue,
} from "@/components/dashboard/dashboard-filters";
import type { ChannelKey } from "@/hooks/use-channel-counts";
import { CHANNEL_INSTANCES } from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

/**
 * Four-column shell hosting the channel rail, conversation list, thread,
 * and contact panel.
 *
 * URL-synced state:
 *   ?agents=sara,tom              dashboard-style multi-select agent filter
 *   ?channels=whatsapp:loc_dubai  dashboard-style multi-select channel
 *   ?status=open|snoozed|closed   tab
 *   ?q=…                          search
 *   ?id=<uuid>                    active conversation
 *   ?panel=closed                 contact panel forced closed
 *
 * The channel rail on the left stays the primary affordance — clicking a
 * tile sets the channels filter to "all branches of that channel" so the
 * rail and the dropdown stay in lock-step.
 */

const VIEWPORT_BREAKPOINT_PX = 1280;

function subscribeViewport(cb: () => void) {
  const mql = window.matchMedia(`(min-width: ${VIEWPORT_BREAKPOINT_PX}px)`);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
function readViewportWide() {
  return window.matchMedia(`(min-width: ${VIEWPORT_BREAKPOINT_PX}px)`).matches;
}

function readFilters(params: URLSearchParams): FilterValue {
  const a = params.get("agents");
  const c = params.get("channels");
  return {
    agentIds: !a || a === "all" ? "all" : a.split(",").filter(Boolean),
    channelKeys: !c || c === "all" ? "all" : c.split(",").filter(Boolean),
  };
}

/** Map filter state → ChannelRail active state.
 *
 *   • all → "all"
 *   • every selected instance shares one channel (e.g. all WhatsApp branches)
 *     → that channel
 *   • mixed → "all" (rail can't represent multi-channel selection)
 */
function activeChannelForRail(filters: FilterValue): ChannelKey {
  if (filters.channelKeys === "all" || filters.channelKeys.length === 0) return "all";
  const channels = new Set(
    filters.channelKeys
      .map((k) => CHANNEL_INSTANCES.find((c) => c.key === k)?.channel)
      .filter(Boolean) as string[],
  );
  if (channels.size === 1) return [...channels][0] as ChannelKey;
  return "all";
}

export default function ConversationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const activeConversationId = searchParams.get("id");
  const panelExplicit = searchParams.get("panel");

  const isWide = useSyncExternalStore(subscribeViewport, readViewportWide, () => true);
  const panelOpen = panelExplicit ? panelExplicit !== "closed" : isWide;

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setFilters = useCallback(
    (next: FilterValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.agentIds === "all" || next.agentIds.length === 0) params.delete("agents");
      else params.set("agents", next.agentIds.join(","));
      if (next.channelKeys === "all" || next.channelKeys.length === 0) params.delete("channels");
      else params.set("channels", next.channelKeys.join(","));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /** Channel-rail tile click → set channels filter to all instances of
   *  that channel family, or clear it for "all". */
  const onRailChange = useCallback(
    (next: ChannelKey) => {
      if (next === "all") {
        setFilters({ ...filters, channelKeys: "all" });
        return;
      }
      const keysForChannel = CHANNEL_INSTANCES.filter((c) => c.channel === next).map((c) => c.key);
      setFilters({ ...filters, channelKeys: keysForChannel.length > 0 ? keysForChannel : "all" });
    },
    [filters, setFilters],
  );

  const agentsList = filters.agentIds === "all" ? undefined : filters.agentIds;
  const channelsList = filters.channelKeys === "all" ? undefined : filters.channelKeys;
  const railActive = activeChannelForRail(filters);

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] min-h-0">
      <PusherStatusBanner />
      <div className="px-5 py-2 border-b border-border bg-surface flex items-center justify-between gap-3">
        <DashboardFiltersBar value={filters} onChange={setFilters} />
      </div>
      <div
        className={cn(
          "grid flex-1 min-h-0",
          panelOpen
            ? "grid-cols-[72px_340px_1fr_360px]"
            : "grid-cols-[72px_340px_1fr]",
        )}
      >
        <ChannelRail
          active={railActive}
          onChange={onRailChange}
          locationId="all"
          pusherChannel={null}
          agents={agentsList}
          channels={channelsList}
        />

        <ConversationList
          filters={{
            locationId: "all",
            channel: "all",
            status: (searchParams.get("status") as "open" | "snoozed" | "closed") ?? "open",
            search: searchParams.get("q") ?? undefined,
            agents: agentsList,
            channels: channelsList,
          }}
          onFiltersChange={(next) => {
            if (next.status !== ((searchParams.get("status") as string) ?? "open")) {
              setParam("status", next.status === "open" ? null : next.status);
            }
            if ((next.search ?? "") !== (searchParams.get("q") ?? "")) {
              setParam("q", next.search ?? null);
            }
          }}
          activeId={activeConversationId}
          onPick={(id) => setParam("id", id)}
          pusherChannel={null}
        />

        {activeConversationId ? (
          <Thread conversationId={activeConversationId} />
        ) : (
          <ThreadEmptyState />
        )}

        {panelOpen ? (
          activeConversationId ? (
            <ContactPanel
              conversationId={activeConversationId}
              onClose={() => setParam("panel", "closed")}
            />
          ) : (
            <aside className="bg-surface border-l border-border flex items-center justify-center text-sm text-text-secondary px-6 text-center">
              Select a conversation to see contact details.
            </aside>
          )
        ) : (
          <FloatingReopenButton onClick={() => setParam("panel", null)} />
        )}
      </div>
    </div>
  );
}

function ThreadEmptyState() {
  return (
    <div className="bg-[#FBFCFD] flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center">
        <MessageSquare size={28} />
      </div>
      <h3 className="text-base font-semibold">Select a conversation</h3>
      <p className="text-sm text-text-secondary max-w-sm">
        Pick one from the list to load the thread.
      </p>
    </div>
  );
}

function FloatingReopenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open contact panel"
      className="fixed right-3 top-[76px] w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80"
    >
      <PanelRightOpen size={20} />
    </button>
  );
}
