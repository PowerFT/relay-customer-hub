"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";

type Datum = { m: string; v: number };

const TARGET_MINUTES = 10;

export function ResponseTimeChart({ filterQuery = "" }: { filterQuery?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "response-time", "12m", filterQuery],
    queryFn: async (): Promise<{ data: Datum[] }> => {
      const qs = filterQuery ? `&${filterQuery}` : "";
      const res = await fetch(`/api/stats/response-time?range=12m${qs}`);
      if (!res.ok) throw new Error(`response-time ${res.status}`);
      return res.json();
    },
  });

  const series = data?.data ?? [];
  const lastIndex = series.length - 1;

  return (
    <ChartCard title="Avg Response Time" subtitle="Median minutes per month" dropdownLabel="Year">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="rt-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#068B78" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#068B78" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#EEF1F6" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickCount={5} />
            <ReferenceLine
              y={TARGET_MINUTES}
              stroke="#9CA3AF"
              strokeDasharray="4 3"
              label={{ value: "target 10m", position: "insideTopRight", fill: "#9CA3AF", fontSize: 10 }}
            />
            <Tooltip
              cursor={{ stroke: "#D5DCE8", strokeDasharray: "4 3" }}
              content={CustomTooltip as never}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#068B78"
              strokeWidth={2.5}
              fill="url(#rt-fill)"
              dot={(props) => {
                const { cx, cy, index } = props as { cx?: number; cy?: number; index?: number };
                const isLast = typeof index === "number" && index === lastIndex;
                if (cx == null || cy == null) {
                  return <g key={index ?? "dot"} />;
                }
                return (
                  <circle
                    key={index ?? "dot"}
                    cx={cx}
                    cy={cy}
                    r={isLast ? 5 : 3}
                    fill="#068B78"
                    stroke="white"
                    strokeWidth={isLast ? 2 : 1}
                  />
                );
              }}
              activeDot={{ r: 6, fill: "#068B78", stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {isLoading && <p className="text-xs text-text-tertiary mt-1.5">Loading…</p>}
    </ChartCard>
  );
}

type RechartsTooltipProps = {
  active?: boolean;
  payload?: { value: unknown }[];
};

function CustomTooltip(props: RechartsTooltipProps) {
  const { active, payload } = props;
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0].value;
  if (typeof v !== "number") return null;
  const minutes = Math.floor(v);
  const seconds = Math.round((v - minutes) * 60);
  return (
    <div className="bg-text-primary text-white text-xs font-semibold px-2.5 py-1.5 rounded-md">
      {minutes}m {seconds}s
    </div>
  );
}
