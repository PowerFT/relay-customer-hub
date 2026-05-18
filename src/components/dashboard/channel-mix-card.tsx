"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { ChannelMixSlice } from "@/lib/dashboard/mock-data";

type ChannelMixResponse = {
  slices: ChannelMixSlice[];
  total: number;
  mode: "channel" | "branch";
  channelLabel?: string;
};

export function ChannelMixCard({ filterQuery = "" }: { filterQuery?: string }) {
  const qs = filterQuery ? `?${filterQuery}` : "";
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "channel-mix", filterQuery],
    queryFn: async (): Promise<ChannelMixResponse> => {
      const res = await fetch(`/api/dashboard/channel-mix${qs}`);
      if (!res.ok) throw new Error(`channel-mix ${res.status}`);
      return res.json();
    },
  });

  const slices = data?.slices ?? [];
  const total = data?.total ?? slices.reduce((s, x) => s + x.value, 0);
  const mode = data?.mode ?? "channel";
  const channelLabel = data?.channelLabel;

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm">
      <div className="flex items-start justify-between px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary flex items-center gap-2">
            Channel Mix
            {mode === "branch" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary-soft text-primary px-1.5 py-0.5 rounded">
                Branches
              </span>
            )}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {mode === "branch" && channelLabel
              ? `${channelLabel} conversations by branch`
              : "Active conversations by channel"}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-canvas text-text-secondary hover:bg-surface"
        >
          Week
          <ChevronDown size={12} />
        </button>
      </div>
      <div className="px-5 pb-5 pt-2 flex flex-col items-center gap-4">
        <div className="relative" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={0}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.id} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
            <div>
              <div className="text-[28px] font-bold tracking-tight leading-none">
                {isLoading ? "…" : total}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mt-1">
                Conversations
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col gap-2">
          {slices.map((s) => (
            <div key={s.id} className="flex justify-between items-center text-[13px]">
              <span className="inline-flex items-center gap-2 text-text-primary">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden
                />
                {s.name}
              </span>
              <span className="text-text-secondary font-medium">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
