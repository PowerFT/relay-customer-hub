"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Smile,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { TemplateDialog } from "@/components/conversations/template-dialog";
import type { ThreadMessage } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function makeTempId(): string {
  // crypto.randomUUID is available in modern browsers and Node — avoids
  // a runtime dep on nanoid.
  return `tmp_${crypto.randomUUID()}`;
}

type SendResponse = { message: ThreadMessage; tempId: string | null };

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  webchat: "Webchat",
  email: "Email",
  sms: "SMS",
};
const CHANNEL_COLOR_VARS: Record<string, string> = {
  whatsapp: "var(--color-c-whatsapp)",
  messenger: "var(--color-c-messenger)",
  instagram: "var(--color-c-instagram)",
  tiktok: "var(--color-c-tiktok)",
  linkedin: "var(--color-c-linkedin)",
  webchat: "var(--color-c-webchat)",
  email: "var(--color-c-email)",
  sms: "var(--color-c-sms)",
};

export function Composer({
  conversationId,
  channel,
  lastInboundAt,
}: {
  conversationId: string;
  channel: string;
  lastInboundAt: string | null;
}) {
  const [value, setValue] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const queryClient = useQueryClient();

  // Date.now() in render is impure + sync setState in effect is also flagged
  // by the React Compiler lint. Schedule the first check via setTimeout(0) so
  // it lands in a separate tick; refresh every minute so the 24h boundary
  // flips live if the user lingers when it expires.
  const [insideWindow, setInsideWindow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if (!lastInboundAt) {
        setInsideWindow(false);
        return;
      }
      setInsideWindow(
        Date.now() - new Date(lastInboundAt).getTime() < TWENTY_FOUR_HOURS,
      );
    };
    const initial = setTimeout(check, 0);
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [lastInboundAt]);

  // Auto-grow textarea up to 6 rows worth of height (~144px)
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);
  useEffect(resize, [value, resize]);

  const send = useMutation({
    mutationFn: async ({
      body,
      tempId,
    }: {
      body: string;
      tempId: string;
    }): Promise<SendResponse> => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId, body }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `send ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      // Replace the optimistic row with the server-confirmed one
      queryClient.setQueryData<{ pages: { items: ThreadMessage[] }[] }>(
        ["messages", conversationId],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p, i) => {
              if (i !== prev.pages.length - 1) return p;
              return {
                ...p,
                items: p.items.map((m) =>
                  m.id === vars.tempId ? data.message : m,
                ),
              };
            }),
          };
        },
      );
    },
    onError: (err, vars) => {
      queryClient.setQueryData<{ pages: { items: ThreadMessage[] }[] }>(
        ["messages", conversationId],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p, i) => {
              if (i !== prev.pages.length - 1) return p;
              return {
                ...p,
                items: p.items.map((m) =>
                  m.id === vars.tempId ? { ...m, status: "failed" } : m,
                ),
              };
            }),
          };
        },
      );
      toast.error(err instanceof Error ? err.message : "Send failed");
    },
  });

  const submit = useCallback(() => {
    const body = value.trim();
    if (!body || send.isPending || !insideWindow) return;
    const tempId = makeTempId();

    // Optimistic insert at the end of the last page
    queryClient.setQueryData<{ pages: { items: ThreadMessage[] }[] }>(
      ["messages", conversationId],
      (prev) => {
        if (!prev) return prev;
        const optimistic: ThreadMessage = {
          id: tempId,
          ghlMessageId: null,
          direction: "outbound",
          body,
          attachments: [],
          sentAt: new Date().toISOString(),
          deliveredAt: null,
          readAt: null,
          status: "sending",
          authorId: null,
          authorName: null,
          authorInitials: null,
          authorTone: null,
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          pages: prev.pages.map((p, i) =>
            i === prev.pages.length - 1
              ? { ...p, items: [...p.items, optimistic] }
              : p,
          ),
        };
      },
    );

    setValue("");
    send.mutate({ body, tempId });
  }, [value, insideWindow, conversationId, queryClient, send]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border bg-surface px-5 pt-3 pb-4 flex-shrink-0">
      {!insideWindow ? (
        <OutsideWindowBanner onOpenTemplates={() => setTemplateOpen(true)} />
      ) : (
        <ChannelPill channel={channel} />
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-border bg-canvas px-3 pt-2 pb-2 focus-within:border-primary focus-within:bg-surface transition-colors",
          !insideWindow && "opacity-50 pointer-events-none",
        )}
      >
        <div className="flex gap-0.5 pb-1.5 text-text-secondary">
          <ToolButton title="Attach file"><Paperclip size={18} /></ToolButton>
          <ToolButton title="Insert image"><ImageIcon size={18} /></ToolButton>
          <ToolButton title="Templates" onClick={() => setTemplateOpen(true)}><Sparkles size={18} /></ToolButton>
          <ToolButton title="Emoji"><Smile size={18} /></ToolButton>
          <ToolButton title="Voice"><Mic size={18} /></ToolButton>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={insideWindow ? "Type your reply…" : "Outside 24-hour window"}
          disabled={!insideWindow || send.isPending}
          className="flex-1 bg-transparent text-sm leading-snug resize-none py-1.5 max-h-36 outline-none placeholder:text-text-tertiary"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          disabled={!value.trim() || send.isPending || !insideWindow}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover active:scale-95 transition disabled:bg-border-strong disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-[11px] text-text-tertiary mt-2 px-1">
        ⏎ Send · Shift+⏎ New line · ⌘⏎ Send
      </p>

      <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
}

function ChannelPill({ channel }: { channel: string }) {
  const label = CHANNEL_LABELS[channel] ?? channel;
  const color = CHANNEL_COLOR_VARS[channel] ?? "#9CA3AF";
  return (
    <div
      className="inline-flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full text-[12px] font-medium mb-2"
      // 15% tinted background of the channel color; text matches the brand color.
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <span
        className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
        style={{ background: color }}
      >
        {label.charAt(0)}
      </span>
      Replying via {label}
    </div>
  );
}

function OutsideWindowBanner({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  return (
    <div className="mb-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-xs flex items-center justify-between gap-3">
      <span className="text-text-primary">
        Outside the 24-hour window. Choose an approved WhatsApp template to start a new conversation.
      </span>
      <button
        type="button"
        onClick={onOpenTemplates}
        className="px-2.5 py-1 rounded-md bg-warning text-white font-medium hover:bg-warning/90 whitespace-nowrap"
      >
        Choose template
      </button>
    </div>
  );
}

function ToolButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-8 h-8 rounded-md hover:bg-surface hover:text-text-primary flex items-center justify-center"
    >
      {children}
    </button>
  );
}
