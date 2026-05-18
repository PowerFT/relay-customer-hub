"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const CHANNEL_CHIPS = [
  { id: "all", label: "All channels" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "messenger", label: "Messenger" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Email" },
] as const;

type TopbarUser = {
  name: string;
  initials: string;
  imageUrl?: string | null;
};

export function Topbar({ user }: { user: TopbarUser }) {
  const pathname = usePathname();
  const isConversations = pathname.startsWith("/conversations");

  return (
    <header className="h-[60px] bg-surface border-b border-border flex items-center gap-4 px-6 flex-shrink-0">
      <label className="flex items-center gap-2 bg-canvas border border-transparent rounded-[10px] px-3 py-2 w-[420px] max-w-[40vw] focus-within:border-primary focus-within:bg-surface transition-colors">
        <Search size={16} className="text-text-tertiary flex-shrink-0" />
        <input
          type="search"
          placeholder={
            isConversations
              ? "Search conversations, contacts, messages…"
              : "Search anything…"
          }
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
        />
        <kbd className="text-[11px] text-text-tertiary border border-border bg-surface rounded px-1.5 py-px font-mono">
          ⌘K
        </kbd>
      </label>

      {isConversations && (
        <div className="flex gap-1.5 items-center overflow-hidden">
          {CHANNEL_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-canvas text-text-secondary whitespace-nowrap transition-colors",
                c.id === "all" && "bg-primary-soft text-primary border-transparent",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border rounded-lg bg-canvas text-text-secondary hover:bg-surface hover:border-border-strong"
        >
          <span className="w-2 h-2 rounded-full bg-success" aria-hidden />
          Available
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-unread-badge ring-2 ring-surface" />
        </button>
        <button
          type="button"
          aria-label="Create"
          className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
        <UserChip user={user} />
      </div>
    </header>
  );
}

function UserChip({ user }: { user: TopbarUser }) {
  if (user.imageUrl) {
    return (
      <Image
        src={user.imageUrl}
        alt={user.name}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover cursor-pointer"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#A7CAF0] text-text-primary flex items-center justify-center text-[13px] font-semibold cursor-pointer">
      {user.initials}
    </div>
  );
}
