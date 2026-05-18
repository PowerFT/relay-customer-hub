"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";

export type Note = {
  id: string;
  body: string | null;
  mentions: unknown;
  createdAt: string;
  authorId: string | null;
  authorName: string | null;
  authorInitials: string | null;
  authorTone: string | null;
};

export function useNotes(conversationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["notes", conversationId], [conversationId]);

  const query = useQuery({
    enabled: !!conversationId,
    queryKey,
    queryFn: async (): Promise<{ items: Note[] }> => {
      const res = await fetch(`/api/conversations/${conversationId}/notes`);
      if (!res.ok) throw new Error(`notes ${res.status}`);
      return res.json();
    },
  });

  const onNoteAdded = useCallback(
    (data: { conversationId: string; note: Note }) => {
      if (data.conversationId !== conversationId) return;
      queryClient.setQueryData<{ items: Note[] }>(queryKey, (prev) => {
        if (!prev) return { items: [data.note] };
        if (prev.items.some((n) => n.id === data.note.id)) return prev;
        return { items: [...prev.items, data.note] };
      });
    },
    [conversationId, queryClient, queryKey],
  );

  usePusherChannel(
    conversationId ? `private-conversation-${conversationId}` : null,
    "note:added",
    onNoteAdded,
  );

  const add = useMutation({
    mutationFn: async ({ body, mentions }: { body: string; mentions: string[] }) => {
      const res = await fetch(`/api/conversations/${conversationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, mentions }),
      });
      if (!res.ok) throw new Error(`add note ${res.status}`);
      return res.json();
    },
  });

  return {
    notes: query.data?.items ?? [],
    isLoading: query.isLoading,
    addNote: add.mutateAsync,
    isAdding: add.isPending,
  };
}
