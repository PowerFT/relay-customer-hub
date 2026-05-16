"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { MessageSquare, PanelRightOpen } from "lucide-react";

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

  const channelFilter = (searchParams.get("channel") ?? "all") as ChannelFilter;
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

  // If the viewport drops below the breakpoint and panel wasn't explicitly
  // set, snap it closed — saves the user a click on tablet.
  useEffect(() => {
    if (panelExplicit) return;
    // Just relying on derived `panelOpen` above; no state to push.
  }, [panelExplicit, isWide]);

  return (
    <div
      className={cn(
        "grid h-[calc(100vh-60px)] min-h-0",
        panelOpen
          ? "grid-cols-[72px_340px_1fr_360px]"
          : "grid-cols-[72px_340px_1fr]",
      )}
    >
      <ChannelRailPlaceholder
        active={channelFilter}
        onChange={(v) => setParam("channel", v === "all" ? null : v)}
      />

      <ConversationListPlaceholder
        activeId={activeConversationId}
        onPick={(id) => setParam("id", id)}
        channelFilter={channelFilter}
      />

      {activeConversationId ? (
        <ThreadPlaceholder conversationId={activeConversationId} />
      ) : (
        <ThreadEmptyState />
      )}

      {panelOpen ? (
        <ContactPanelPlaceholder
          conversationId={activeConversationId}
          onClose={() => setParam("panel", "closed")}
        />
      ) : (
        <FloatingReopenButton onClick={() => setParam("panel", null)} />
      )}
    </div>
  );
}

// ─── Placeholders ────────────────────────────────────────────────────────────
// Rows 13/14/15/17 replace these with the real implementations in
// src/components/conversations/{channel-rail,conversation-list,thread,contact-panel}.tsx

type ChannelFilter = "all" | "whatsapp" | "messenger" | "instagram" | "email" | string;

function ChannelRailPlaceholder({
  active,
  onChange,
}: {
  active: ChannelFilter;
  onChange: (v: ChannelFilter) => void;
}) {
  const chips: { id: ChannelFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "whatsapp", label: "WA" },
    { id: "messenger", label: "FB" },
    { id: "instagram", label: "IG" },
    { id: "email", label: "EM" },
  ];
  return (
    <aside className="bg-canvas border-r border-border flex flex-col items-center gap-2.5 py-4 overflow-y-auto">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "w-14 h-14 rounded-2xl bg-surface shadow-sm border border-transparent text-xs font-medium text-text-secondary transition-all",
            active === c.id && "border-primary/20 shadow-md scale-105",
          )}
        >
          {c.label}
        </button>
      ))}
      <p className="text-[10px] text-text-tertiary text-center mt-4 px-1">
        Row 13 replaces this with the real rail.
      </p>
    </aside>
  );
}

function ConversationListPlaceholder({
  activeId,
  onPick,
  channelFilter,
}: {
  activeId: string | null;
  onPick: (id: string) => void;
  channelFilter: ChannelFilter;
}) {
  return (
    <div className="bg-surface border-r border-border flex flex-col min-h-0">
      <div className="p-4 border-b border-border">
        <p className="text-sm font-semibold">Conversations</p>
        <p className="text-xs text-text-secondary">
          channel: <span className="font-mono">{channelFilter}</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <p className="text-xs text-text-tertiary">
          Row 14 replaces this with paginated, real-time conversation list.
        </p>
        {/* Demo rows so the layout breathes during dev */}
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(`demo-${n}`)}
            className={cn(
              "w-full text-left p-3 rounded-lg border border-border hover:bg-canvas",
              activeId === `demo-${n}` && "bg-primary-soft border-primary/30",
            )}
          >
            <div className="text-sm font-medium">Demo conversation {n}</div>
            <div className="text-xs text-text-secondary mt-1">Click to load thread →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThreadPlaceholder({ conversationId }: { conversationId: string }) {
  return (
    <div className="bg-[#FBFCFD] flex flex-col min-h-0">
      <header className="h-16 bg-surface border-b border-border px-5 flex items-center">
        <p className="text-sm font-semibold">Thread — {conversationId}</p>
      </header>
      <div className="flex-1 p-6 text-sm text-text-secondary overflow-y-auto">
        Row 15 replaces this with bubbles, date dividers, read receipts, attachments.
        Row 16 adds the composer at the bottom.
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

function ContactPanelPlaceholder({
  conversationId,
  onClose,
}: {
  conversationId: string | null;
  onClose: () => void;
}) {
  return (
    <aside className="bg-surface border-l border-border flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold">Contact</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="text-text-secondary hover:text-text-primary"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 text-sm text-text-secondary">
        {conversationId
          ? `Row 17 fills this with contact details, notes, and history for ${conversationId}.`
          : "No conversation selected."}
      </div>
    </aside>
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
