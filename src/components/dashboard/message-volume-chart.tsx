"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";

type Datum = { day: string; inbound: number; outbound: number };

export function MessageVolumeChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "volume", "7d", "all"],
    queryFn: async (): Promise<{ data: Datum[] }> => {
      const res = await fetch("/api/stats/volume?range=7d&locationId=all");
      if (!res.ok) throw new Error(`volume ${res.status}`);
      return res.json();
    },
  });

  return (
    <ChartCard title="Message Volume" subtitle="Last 7 days" dropdownLabel="Week">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.data ?? []} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickCount={5} />
            <Tooltip
              cursor={{ fill: "#F5F7FA" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E2E8F1",
                fontSize: 12,
              }}
            />
            <Bar dataKey="inbound" name="Inbound" fill="#068B78" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="outbound" name="Outbound" fill="#9ECEFF" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend />
      {isLoading && <p className="text-xs text-text-tertiary mt-1.5">Loading…</p>}
    </ChartCard>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 mt-3 text-xs text-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Inbound
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#9ECEFF" }} /> Outbound
      </span>
    </div>
  );
}
