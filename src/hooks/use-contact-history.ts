"use client";

import { useQuery } from "@tanstack/react-query";

export type HistoryItem = {
  id: string;
  channel: string;
  status: string;
  lastMessageAt: string | null;
  preview: string | null;
  assigneeInitials: string | null;
  assigneeTone: string | null;
};

export function useContactHistory(contactId: string | null) {
  return useQuery({
    enabled: !!contactId,
    queryKey: ["contact-history", contactId],
    queryFn: async (): Promise<{ items: HistoryItem[] }> => {
      const res = await fetch(`/api/contacts/${contactId}/conversations`);
      if (!res.ok) throw new Error(`history ${res.status}`);
      return res.json();
    },
  });
}
