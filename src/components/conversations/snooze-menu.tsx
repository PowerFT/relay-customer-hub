"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addHours, format, nextMonday, set, startOfTomorrow } from "date-fns";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SnoozeOption = {
  label: string;
  /** Compute the target time at click time so 'Tomorrow 9am' is correct relative to "now". */
  compute: () => Date;
};

const OPTIONS: SnoozeOption[] = [
  { label: "1 hour", compute: () => addHours(new Date(), 1) },
  { label: "4 hours", compute: () => addHours(new Date(), 4) },
  {
    label: "Tomorrow 9am",
    compute: () => set(startOfTomorrow(), { hours: 9, minutes: 0, seconds: 0 }),
  },
  {
    label: "Next Monday 9am",
    compute: () => set(nextMonday(new Date()), { hours: 9, minutes: 0, seconds: 0 }),
  },
];

export function SnoozeMenu({
  conversationId,
  trigger,
  open,
  onOpenChange,
}: {
  conversationId: string;
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const snooze = useMutation({
    mutationFn: async (until: Date) => {
      const res = await fetch(`/api/conversations/${conversationId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until: until.toISOString() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `snooze ${res.status}`);
      }
      return res.json() as Promise<{ until: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success(`Snoozed until ${format(new Date(data.until), "EEE d LLL p")}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Snooze failed"),
  });

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.label}
            onClick={() => snooze.mutate(opt.compute())}
            className="px-3 py-2 text-sm cursor-pointer hover:bg-canvas"
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Convenience: button + uncontrolled dropdown. */
export function SnoozeButton({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <SnoozeMenu
      conversationId={conversationId}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          title="Snooze"
          aria-label="Snooze"
          className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
        >
          <span className="lucide-bell" />
        </button>
      }
    />
  );
}
