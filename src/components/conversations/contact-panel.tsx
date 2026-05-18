"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageCircle, X } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { AssignDropdown } from "@/components/conversations/assign-dropdown";
import { useConversation } from "@/hooks/use-conversation";
import { useContactHistory } from "@/hooks/use-contact-history";
import { useNotes } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";

type Tab = "contact" | "notes" | "history";

export function ContactPanel({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("contact");
  const { data: conversation } = useConversation(conversationId);
  const { notes } = useNotes(conversationId);

  return (
    <aside className="bg-surface border-l border-border flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex gap-3 -mb-px">
          {(["contact", "notes", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "py-2 px-1 text-[13px] font-medium capitalize border-b-2",
                tab === t
                  ? "text-primary border-primary"
                  : "text-text-secondary border-transparent hover:text-text-primary",
              )}
            >
              {t}
              {t === "notes" && notes.length > 0 && (
                <span className="ml-1 text-text-tertiary">· {notes.length}</span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="w-7 h-7 rounded-md text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
      <div className="border-b border-border" aria-hidden />

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "contact" && <ContactTab conversation={conversation} />}
        {tab === "notes" && <NotesTab conversationId={conversationId} />}
        {tab === "history" && (
          <HistoryTab contactId={conversation?.contactId ?? null} />
        )}
      </div>
    </aside>
  );
}

function ContactTab({
  conversation,
}: {
  conversation:
    | ReturnType<typeof useConversation>["data"]
    | null
    | undefined;
}) {
  if (!conversation) {
    return <p className="text-sm text-text-secondary">Loading…</p>;
  }

  const initials = (conversation.contactName ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-xl font-semibold"
          style={{ background: conversation.contactTone ?? "#DDE2EC" }}
        >
          {initials}
        </div>
        <h3 className="mt-3 text-[17px] font-semibold flex items-center gap-1.5">
          {conversation.contactName ?? "Unknown"}
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          {conversation.contactPhone ?? conversation.contactEmail ?? "—"}
        </p>
      </div>

      <Section title="Channels">
        <ChannelRow label="WhatsApp" value={conversation.contactPhone ?? null} color="var(--color-c-whatsapp)" />
        <ChannelRow label="Email" value={conversation.contactEmail ?? null} color="var(--color-c-email)" />
        <ChannelRow label="Instagram" value={conversation.contactInstagram ?? null} color="var(--color-c-instagram)" />
        <ChannelRow label="SMS" value={null} color="var(--color-c-sms)" />
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="green">Customer</Tag>
          <Tag tone="amber">VIP</Tag>
          <button
            type="button"
            className="text-[11px] px-2.5 py-0.5 rounded-full border border-border-strong text-text-secondary hover:bg-canvas"
            onClick={() => toast("Tag editing coming in a future iteration")}
          >
            + Add
          </button>
        </div>
      </Section>

      <Section title="Details">
        <KVRow k="Customer since" v={fmtFieldValue(conversation.contactCustomFields, "customerSince")} />
        <KVRow k="Lifetime value" v={fmtFieldValue(conversation.contactCustomFields, "lifetimeValue")} />
        <KVRow k="Total orders" v={fmtFieldValue(conversation.contactCustomFields, "totalOrders")} />
        <KVRow k="Last order" v={fmtFieldValue(conversation.contactCustomFields, "lastOrder")} />
      </Section>

      <Section title="Assigned to">
        <div className="flex items-center justify-between gap-2 bg-canvas rounded-lg p-2.5 text-[13px]">
          <div className="flex items-center gap-2 min-w-0">
            {conversation.assigneeName ? (
              <>
                <span
                  className="w-6 h-6 rounded-full text-[11px] font-bold text-text-primary inline-flex items-center justify-center"
                  style={{ background: conversation.assigneeTone ?? "#DDE2EC" }}
                >
                  {conversation.assigneeInitials ?? "?"}
                </span>
                <span className="truncate">{conversation.assigneeName}</span>
              </>
            ) : (
              <span className="text-text-secondary">Unassigned</span>
            )}
          </div>
          <AssignDropdown
            conversationId={conversation.id}
            currentAssigneeId={conversation.assigneeId}
            trigger={
              <span className="text-xs px-2 py-1 rounded-md border border-border bg-surface text-text-secondary hover:text-text-primary">
                Change
              </span>
            }
          />
        </div>
      </Section>
    </div>
  );
}

function fmtFieldValue(customFields: unknown, key: string): string {
  if (!customFields) return "—";
  if (Array.isArray(customFields)) {
    for (const f of customFields) {
      if (typeof f === "object" && f && "key" in f && (f as { key: string }).key === key) {
        const v = (f as { value?: string | number }).value;
        return v != null ? String(v) : "—";
      }
    }
  } else if (typeof customFields === "object" && customFields !== null) {
    const v = (customFields as Record<string, unknown>)[key];
    if (v != null) return String(v);
  }
  return "—";
}

function NotesTab({ conversationId }: { conversationId: string }) {
  const { notes, isLoading, addNote, isAdding } = useNotes(conversationId);
  const [body, setBody] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isAdding) return;
    try {
      await addNote({ body: trimmed, mentions: extractMentions(trimmed) });
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add note failed");
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit(e as unknown as FormEvent);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No notes yet. Add one below — only the team sees these.
          </p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border p-3 text-[13px]"
              style={{ background: "#FFF8E1", borderColor: "#F5E4A8" }}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mb-1.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-text-primary"
                  style={{ background: n.authorTone ?? "#DDE2EC" }}
                >
                  {n.authorInitials ?? "?"}
                </span>
                <span>{n.authorName ?? "Agent"}</span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-snug">{n.body}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="border-t border-border pt-3 flex flex-col gap-2">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKey}
          placeholder="Add a note for the team. Type @ to mention someone."
          className="w-full text-sm bg-canvas border border-border rounded-lg p-2.5 resize-none outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">⌘⏎ Submit</span>
          <button
            type="submit"
            disabled={!body.trim() || isAdding}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover disabled:bg-border-strong"
          >
            {isAdding ? "Adding…" : "Add note"}
          </button>
        </div>
      </form>
    </div>
  );
}

function extractMentions(body: string): string[] {
  // Simple @mention extractor — Row 17 ships a primitive version that
  // captures handles after `@`. Row 18+ may upgrade to a typeahead picker.
  const matches = body.match(/@(\w+)/g) ?? [];
  return matches.map((m) => m.slice(1));
}

function HistoryTab({ contactId }: { contactId: string | null }) {
  const { data, isLoading } = useContactHistory(contactId);

  if (!contactId) return <p className="text-sm text-text-secondary">No contact.</p>;
  if (isLoading) return <p className="text-sm text-text-secondary">Loading…</p>;
  const items = data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">No prior conversations.</p>;
  }

  return (
    <div className="flex flex-col">
      {items.map((c) => (
        <div key={c.id} className="flex gap-2.5 py-3 border-b border-border last:border-b-0">
          <div
            className="w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0"
            style={{ background: channelColor(c.channel) }}
          >
            <MessageCircle size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate">
              {c.preview ?? "—"}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              <span>
                {c.lastMessageAt
                  ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })
                  : "—"}
              </span>
              {c.assigneeInitials && (
                <>
                  <span>·</span>
                  <span
                    className="w-4 h-4 rounded-full text-[9px] font-bold text-text-primary inline-flex items-center justify-center"
                    style={{ background: c.assigneeTone ?? "#DDE2EC" }}
                  >
                    {c.assigneeInitials}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold mb-2.5">
        {title}
      </h4>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ChannelRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-canvas">
      <span
        className="w-6 h-6 rounded-md text-white flex items-center justify-center flex-shrink-0"
        style={{ background: color }}
      >
        <MessageCircle size={12} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-text-secondary">{label}</div>
        <div className="text-[13px] font-medium truncate">
          {value ?? <span className="text-text-tertiary font-normal">— not linked</span>}
        </div>
      </div>
    </div>
  );
}

function KVRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-text-secondary">{k}</span>
      <span className={cn("font-medium", v === "—" && "text-text-tertiary font-normal")}>
        {v}
      </span>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "blue" }) {
  const cls = tone === "green"
    ? "bg-success/10 text-success"
    : tone === "amber"
      ? "bg-warning/15 text-warning"
      : "bg-c-messenger/10 text-c-messenger";
  return (
    <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-medium", cls)}>{children}</span>
  );
}
