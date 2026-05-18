"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { MessageSquare, PanelRightOpen } from "lucide-react";

import { ChannelRail } from "@/components/conversations/channel-rail";
import { ContactPanel } from "@/components/conversations/contact-panel";
import { ConversationList } from "@/components/conversations/conversation-list";
import { Thread } from "@/components/conversations/thread";
import type { ChannelKey } from "@/hooks/use-channel-counts";
import { cn } from "@/lib/utils";

/**
 * Row 12 — shell. Four-column grid that hosts the channel rail, conversation
 * list, thread, and contact panel. Real implementations of the four child
 * regions land in:
 *   • <ChannelRail />     → Row 13
 *   • <ConversationList /> → Row 14
 *   • <Thread />          → Row 15
 *   • <ContactPanel />    → Row 17
 *
 * URL-synced state (so deep links and refreshes work):
 *   ?channel=<id>   channelFilter — 'all' | 'whatsapp' | …
 *   ?id=<uuid>      activeConversationId
 *   ?panel=closed   panelOpen — defaults to open
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

export default function ConversationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const channelFilter = (searchParams.get("channel") ?? "all") as ChannelKey;
  const activeConversationId = searchParams.get("id");
  const panelExplicit = searchParams.get("panel");

  const isWide = useSyncExternalStore(subscribeViewport, readViewportWide, () => true);

  // Panel default: open on ≥1280px, closed below — overridable via ?panel=open|closed
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

  return (
    <div
      className={cn(
        "grid h-[calc(100vh-60px)] min-h-0",
        panelOpen
          ? "grid-cols-[72px_340px_1fr_360px]"
          : "grid-cols-[72px_340px_1fr]",
      )}
    >
      <ChannelRail
        active={channelFilter}
        onChange={(v) => setParam("channel", v === "all" ? null : v)}
        locationId="all"
        pusherChannel={null}
      />

      <ConversationList
        filters={{
          locationId: "all",
          channel: channelFilter,
          status: (searchParams.get("status") as "open" | "snoozed" | "closed") ?? "open",
          search: searchParams.get("q") ?? undefined,
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
  );
}

// Rows 13/14/15/16/17 are now wired above. Only the empty/reopen helpers
// stay inline since they're page-shell concerns.

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
      className="fixed right-6 bottom-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80"
    >
      <PanelRightOpen size={20} />
    </button>
  );
}
