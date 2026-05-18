"use client";

import { useQuery } from "@tanstack/react-query";

export type ConversationDetail = {
  id: string;
  locationId: string;
  channel: string;
  status: string;
  priority: string;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  unreadCount: number;
  pinned: boolean;
  tags: unknown;
  snoozedUntil: string | null;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactTone: string | null;
  contactInstagram: string | null;
  contactCustomFields: unknown;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  assigneeTone: string | null;
};

export function useConversation(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ["conversation", id],
    queryFn: async (): Promise<ConversationDetail> => {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error(`conversation ${res.status}`);
      return res.json();
    },
  });
}
