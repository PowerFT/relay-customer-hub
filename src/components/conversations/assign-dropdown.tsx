"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, UserMinus, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";

export function AssignDropdown({
  conversationId,
  currentAssigneeId,
  trigger,
  open,
  onOpenChange,
}: {
  conversationId: string;
  currentAssigneeId: string | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { data } = useUsers();
  const users = data?.users ?? [];
  const queryClient = useQueryClient();

  const assign = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      const res = await fetch(`/api/conversations/${conversationId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `assign ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      // Cheap signal that downstream queries should re-read. The Pusher
      // conversation:updated event will also fire and patch the list.
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Conversation updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    },
  });

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
        aria-label="Assign"
      >
        {trigger ?? <UserPlus size={18} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <DropdownMenuItem
          onClick={() => assign.mutate(null)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-canvas",
            !currentAssigneeId && "font-semibold",
          )}
        >
          <UserMinus size={14} className="text-text-secondary" />
          <span>Unassign</span>
          {!currentAssigneeId && <Check size={14} className="ml-auto text-primary" />}
        </DropdownMenuItem>
        {users.map((u) => {
          const isCurrent = u.id === currentAssigneeId;
          return (
            <DropdownMenuItem
              key={u.id}
              onClick={() => assign.mutate(u.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-canvas",
                isCurrent && "font-semibold",
              )}
            >
              <span
                className="w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center"
                style={{ background: u.tone ?? "#DDE2EC" }}
              >
                {u.initials ?? "?"}
              </span>
              <span className="truncate">{u.name ?? u.email ?? "Unnamed"}</span>
              {isCurrent && <Check size={14} className="ml-auto text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Controllable variant — opens via the `open` prop so keyboard `A` can trigger it. */
export function AssignDropdownControlled(props: React.ComponentProps<typeof AssignDropdown>) {
  const [open, setOpen] = useState(false);
  return <AssignDropdown {...props} open={open} onOpenChange={setOpen} />;
}
