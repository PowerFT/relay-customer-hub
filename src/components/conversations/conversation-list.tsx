"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { MessageCircle, MessageSquare, Search } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

import {
  type ConversationFilters,
  type ConversationListItem as ConversationItem,
  useConversations,
} from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";

type Tab = "open" | "snoozed" | "closed";

export function ConversationList({
  filters,
  onFiltersChange,
  activeId,
  onPick,
  pusherChannel,
}: {
  filters: ConversationFilters;
  onFiltersChange: (next: ConversationFilters) => void;
  activeId: string | null;
  onPick: (id: string) => void;
  pusherChannel: string | null;
}) {
  const {
    items,
    counts,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useConversations(filters, pusherChannel);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="bg-surface border-r border-border flex flex-col min-h-0">
      {/* Sticky header */}
      <div className="px-4 py-3 border-b border-border flex flex-col gap-3">
        <label className="flex items-center gap-2 bg-canvas rounded-[10px] px-3 py-2">
          <Search size={14} className="text-text-tertiary" />
          <input
            type="search"
            placeholder="Search conversations…"
            value={filters.search ?? ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </label>

        <div className="flex bg-canvas rounded-lg p-0.5">
          {(["open", "snoozed", "closed"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onFiltersChange({ ...filters, status: tab })}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                filters.status === tab
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {tab}
              {counts[tab] > 0 && (
                <span className="ml-1 text-text-tertiary">{counts[tab]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {items.map((c) => (
              <ConversationListItemRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onClick={() => onPick(c.id)}
              />
            ))}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="py-3 text-center text-xs text-text-tertiary">Loading…</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConversationListItemRow({
  conversation: c,
  active,
  onClick,
}: {
  conversation: ConversationItem;
  active: boolean;
  onClick: () => void;
}) {
  const unread = c.unreadCount > 0;
  const time = c.lastMessageAt
    ? formatDistanceToNowStrict(new Date(c.lastMessageAt), { addSuffix: false })
    : "";
  const initials = (c.contactName ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "??";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full grid grid-cols-[48px_1fr] gap-3 px-4 py-3 border-b border-border text-left transition-colors",
        "hover:bg-[#FAFBFC]",
        active && "bg-primary-soft/60",
      )}
    >
      {active && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" aria-hidden />
      )}
      <div className="relative">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
          style={{ background: c.contactTone ?? "#DDE2EC", color: "#1A1F2E" }}
        >
          {initials}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface flex items-center justify-center text-white"
          style={{ background: channelColor(c.channel) }}
          title={c.channel}
        >
          <MessageCircle size={8} />
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn(
              "text-sm truncate text-text-primary",
              unread ? "font-bold" : "font-medium",
            )}
          >
            {c.contactName ?? c.contactPhone ?? "Unknown"}
          </span>
          <span
            className={cn(
              "text-[11px] flex-shrink-0",
              unread ? "text-primary font-semibold" : "text-text-secondary",
            )}
          >
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1.5 mt-0.5">
          <span
            className={cn(
              "text-[13px] truncate flex-1",
              unread ? "text-text-primary font-medium" : "text-text-secondary",
            )}
          >
            {c.preview ?? "—"}
          </span>
          {unread && (
            <span className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-primary text-primary-foreground">
              {c.unreadCount}
            </span>
          )}
        </div>
        {c.assigneeId && c.assigneeName && (
          <div
            className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas text-[11px] text-text-secondary"
          >
            <span
              className="w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center text-text-primary"
              style={{ background: c.assigneeTone ?? "#DDE2EC" }}
            >
              {c.assigneeInitials ?? "?"}
            </span>
            <span>{c.assigneeName.split(" ")[0]}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function channelColor(channel: string): string {
  switch (channel) {
    case "whatsapp": return "var(--color-c-whatsapp)";
    case "messenger": return "var(--color-c-messenger)";
    case "instagram": return "var(--color-c-instagram)";
    case "tiktok": return "var(--color-c-tiktok)";
    case "linkedin": return "var(--color-c-linkedin)";
    case "webchat": return "var(--color-c-webchat)";
    case "email": return "var(--color-c-email)";
    case "sms": return "var(--color-c-sms)";
    default: return "#9CA3AF";
  }
}

function ListSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-canvas" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-canvas rounded w-2/3" />
            <div className="h-3 bg-canvas rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4 gap-2">
      <div className="w-12 h-12 rounded-full bg-canvas text-text-tertiary flex items-center justify-center">
        <MessageSquare size={20} />
      </div>
      <h4 className="text-sm font-semibold text-text-primary">No conversations</h4>
      <p className="text-xs text-text-secondary">
        Nothing matches your current filters.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="p-6 text-sm text-danger">Failed to load conversations.</div>
  );
}
