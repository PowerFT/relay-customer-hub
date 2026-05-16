"use client";

import { formatRelative, isSameDay, format } from "date-fns";
import { MessageSquare, MoreHorizontal, Bell, Tag, Check, UserPlus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { AssignDropdown } from "@/components/conversations/assign-dropdown";
import { Composer } from "@/components/conversations/composer";
import { MessageBubble } from "@/components/conversations/message-bubble";
import { useResolveActions } from "@/components/conversations/resolve-button";
import { SnoozeMenu } from "@/components/conversations/snooze-menu";
import { useConversation } from "@/hooks/use-conversation";
import { useMessages, type ThreadMessage } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";

export function Thread({ conversationId }: { conversationId: string }) {
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const { items, isLoading: msgsLoading } = useMessages(conversationId);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const lastMsgIdRef = useRef<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const { resolve } = useResolveActions(conversationId);

  useHotkeys("a", () => setAssignOpen(true), { enableOnFormTags: false }, [setAssignOpen]);
  useHotkeys("s", () => setSnoozeOpen(true), { enableOnFormTags: false }, [setSnoozeOpen]);
  useHotkeys("e", () => resolve(), { enableOnFormTags: false }, [resolve]);

  // Track whether user is near bottom before each render so we can decide
  // if a new inbound message should auto-scroll or be passive.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    wasAtBottomRef.current = distance < 120;
  });

  // Auto-scroll on conversation change + on new messages when applicable.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const lastMsg = items[items.length - 1];
    const isNew = lastMsgIdRef.current !== lastMsg.id;
    lastMsgIdRef.current = lastMsg.id;

    if (isNew && (wasAtBottomRef.current || lastMsg.direction === "outbound")) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

  // Snap to bottom when the conversation switches
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    lastMsgIdRef.current = null;
  }, [conversationId]);

  if (convLoading || !conversation) {
    return (
      <div className="bg-[#FBFCFD] flex flex-col min-h-0">
        <div className="h-16 bg-surface border-b border-border" />
        <div className="flex-1 p-6 text-sm text-text-secondary">Loading…</div>
      </div>
    );
  }

  const initials = (conversation.contactName ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";

  return (
    <div className="bg-[#FBFCFD] flex flex-col min-h-0 h-full">
      <header className="h-16 bg-surface border-b border-border flex items-center gap-3 px-5 flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
          style={{ background: conversation.contactTone ?? "#DDE2EC" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold flex items-center gap-2">
            <span className="truncate">{conversation.contactName ?? "Unknown"}</span>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-px rounded-md bg-c-whatsapp/15 text-c-whatsapp font-bold">
              {conversation.channel}
            </span>
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-success" aria-hidden />
            <span>{conversation.contactPhone ?? conversation.contactEmail ?? "—"}</span>
            {conversation.lastInboundAt && (
              <>
                <span>·</span>
                <span>last seen {formatRelative(new Date(conversation.lastInboundAt), new Date())}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <AssignDropdown
            conversationId={conversationId}
            currentAssigneeId={conversation.assigneeId}
            open={assignOpen}
            onOpenChange={setAssignOpen}
            trigger={<UserPlus size={18} />}
          />
          <SnoozeMenu
            conversationId={conversationId}
            open={snoozeOpen}
            onOpenChange={setSnoozeOpen}
            trigger={
              <button
                type="button"
                title="Snooze (S)"
                aria-label="Snooze"
                className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
              >
                <Bell size={18} />
              </button>
            }
          />
          <ActionButton title="Tag" icon={Tag} />
          <button
            type="button"
            onClick={() => resolve()}
            title="Resolve (E)"
            aria-label="Resolve"
            className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
          >
            <Check size={18} />
          </button>
          <ActionButton title="More" icon={MoreHorizontal} />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[10%] py-6 flex flex-col"
      >
        {msgsLoading ? (
          <ThreadSkeleton />
        ) : items.length === 0 ? (
          <ThreadEmptyState />
        ) : (
          renderMessages(items)
        )}
      </div>

      <Composer
        conversationId={conversationId}
        lastInboundAt={conversation.lastInboundAt}
      />
    </div>
  );
}

function renderMessages(items: ThreadMessage[]) {
  const out: React.ReactNode[] = [];
  let prevDate: Date | null = null;
  for (let i = 0; i < items.length; i += 1) {
    const m = items[i];
    const d = m.sentAt ? new Date(m.sentAt) : null;
    if (d && (!prevDate || !isSameDay(prevDate, d))) {
      out.push(<DateDivider key={`d-${i}`} date={d} />);
    }
    prevDate = d ?? prevDate;
    const showAuthorMeta =
      i === 0 ||
      items[i - 1].direction !== m.direction ||
      items[i - 1].authorId !== m.authorId;
    out.push(<MessageBubble key={m.id} message={m} showAuthorMeta={showAuthorMeta} />);
  }
  return out;
}

function ActionButton({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
    >
      <Icon size={18} />
    </button>
  );
}

function DateDivider({ date }: { date: Date }) {
  return (
    <div className="self-center bg-black/5 text-text-secondary text-[11px] font-medium px-3 py-1 rounded-full my-4">
      {format(date, "EEE, d LLL")}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            "h-9 rounded-2xl bg-canvas",
            i % 2 === 0 ? "self-end w-1/2" : "self-start w-3/5",
          )}
        />
      ))}
    </div>
  );
}

function ThreadEmptyState() {
  return (
    <div className="m-auto flex flex-col items-center text-center gap-2 text-text-secondary">
      <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center">
        <MessageSquare size={20} />
      </div>
      <p className="text-sm">No messages in this conversation yet.</p>
    </div>
  );
}
