import { Check, CheckCheck, File as FileIcon } from "lucide-react";

import type { ThreadMessage } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";

type Attachment = {
  url?: string;
  type?: string;
  name?: string;
  size?: number;
};

function readableSize(bytes?: number): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReadReceipt({ status, readAt, deliveredAt }: { status: string; readAt: string | null; deliveredAt: string | null }) {
  if (readAt) return <CheckCheck size={12} className="text-[#4FA8FF]" />;
  if (deliveredAt || status === "delivered") return <CheckCheck size={12} className="text-text-tertiary" />;
  if (status === "failed") return <span className="text-danger text-[10px]">!</span>;
  return <Check size={12} className="text-text-tertiary" />;
}

export function MessageBubble({
  message,
  showAuthorMeta,
}: {
  message: ThreadMessage;
  showAuthorMeta: boolean;
}) {
  const isOut = message.direction === "outbound";
  const time = message.sentAt
    ? new Date(message.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
  const attachments = Array.isArray(message.attachments)
    ? (message.attachments as Attachment[])
    : [];

  return (
    <div className={cn("flex flex-col gap-0.5 mb-2 max-w-[70%]", isOut ? "self-end items-end" : "self-start")}>
      {showAuthorMeta && isOut && (
        <span className="text-[11px] text-text-tertiary px-1.5">
          via WhatsApp · {message.authorName ?? "Agent"}
        </span>
      )}
      <div
        className={cn(
          "rounded-2xl px-3 pt-2 pb-1.5 text-sm leading-snug break-words shadow-sm",
          isOut
            ? "bg-primary-soft text-text-primary rounded-br-sm"
            : "bg-surface border border-border text-text-primary rounded-bl-sm",
        )}
      >
        {attachments.map((att, i) =>
          att.type?.startsWith("image/") ? (
            <ImageAttachment key={i} attachment={att} />
          ) : (
            <FileAttachment key={i} attachment={att} />
          ),
        )}
        {message.body && (
          <p className="whitespace-pre-wrap">{message.body}</p>
        )}
        <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary float-right mt-1.5 ml-2.5">
          <span>{time}</span>
          {isOut && (
            <ReadReceipt
              status={message.status}
              readAt={message.readAt}
              deliveredAt={message.deliveredAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="relative w-[280px] max-w-full h-[180px] rounded-xl overflow-hidden mb-1.5"
      style={{ background: "linear-gradient(135deg, #B8C7DA, #DDE5F0)" }}
    >
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.15) 12px, rgba(255,255,255,0.15) 13px)",
        }}
      />
      {attachment.name && (
        <div className="absolute bottom-2 left-2 right-2 text-[11px] text-white drop-shadow truncate">
          {attachment.name}
        </div>
      )}
    </div>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex items-center gap-2.5 p-2 bg-white/60 rounded-lg mb-1 min-w-[240px]">
      <div className="w-9 h-9 rounded-lg bg-danger text-white flex items-center justify-center">
        <FileIcon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate">{attachment.name ?? "file"}</div>
        {attachment.size && (
          <div className="text-[11px] text-text-secondary">{readableSize(attachment.size)}</div>
        )}
      </div>
    </div>
  );
}
