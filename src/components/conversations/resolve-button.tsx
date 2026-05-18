"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";

export function ResolveButton({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();

  const resolve = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/resolve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });

      toast.success("Conversation resolved", {
        description: "Press ⌘Z to undo.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => {
            undo.mutate();
          },
        },
      });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Resolve failed"),
  });

  const undo = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/resolve`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Reopened");
    },
  });

  return (
    <button
      type="button"
      onClick={() => resolve.mutate()}
      title="Resolve"
      aria-label="Resolve"
      className="w-9 h-9 rounded-[10px] text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
    >
      <Check size={18} />
    </button>
  );
}

export function useResolveActions(conversationId: string) {
  const queryClient = useQueryClient();

  const resolve = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/resolve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Conversation resolved", {
        description: "Press ⌘Z to undo.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => undo.mutate(),
        },
      });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Resolve failed"),
  });

  const undo = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/resolve`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Reopened");
    },
  });

  return { resolve: resolve.mutate, undo: undo.mutate };
}
