"use client";

import { useQuery } from "@tanstack/react-query";

export type DirectoryUser = {
  id: string;
  name: string | null;
  email: string | null;
  initials: string | null;
  tone: string | null;
  role: string;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<{ users: DirectoryUser[] }> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`users ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — directory rarely changes
  });
}
