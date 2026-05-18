"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CheckCircle2, MailOpen, MessageSquare, MessagesSquare } from "lucide-react";
import { useCallback, useMemo } from "react";

import { ActivityByChannelCard } from "@/components/dashboard/activity-by-channel-card";
import { AgentPerformanceCard } from "@/components/dashboard/agent-performance-card";
import { ChannelMixCard } from "@/components/dashboard/channel-mix-card";
import {
  DashboardFiltersBar,
  type FilterValue,
} from "@/components/dashboard/dashboard-filters";
import { LatestActivityCard } from "@/components/dashboard/latest-activity-card";
import { MessageVolumeChart } from "@/components/dashboard/message-volume-chart";
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import type { DashboardStats } from "@/lib/dashboard/stats";

function readFilters(params: URLSearchParams): FilterValue {
  const a = params.get("agents");
  const c = params.get("channels");
  return {
    agentIds: !a || a === "all" ? "all" : a.split(",").filter(Boolean),
    channelKeys: !c || c === "all" ? "all" : c.split(",").filter(Boolean),
  };
}

/** Encode the filter for the API query string. Returns "" when nothing is
 *  selected so chart-card URLs stay clean by default. */
export function encodeFiltersForQuery(f: FilterValue): string {
  const parts: string[] = [];
  if (f.agentIds !== "all" && f.agentIds.length > 0) {
    parts.push(`agents=${encodeURIComponent(f.agentIds.join(","))}`);
  }
  if (f.channelKeys !== "all" && f.channelKeys.length > 0) {
    parts.push(`channels=${encodeURIComponent(f.channelKeys.join(","))}`);
  }
  return parts.join("&");
}

export function DashboardClient({
  greeting,
  firstName,
  stats,
}: {
  greeting: string;
  firstName: string;
  stats: DashboardStats;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const query = encodeFiltersForQuery(filters);

  const setFilters = useCallback(
    (next: FilterValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.agentIds === "all" || next.agentIds.length === 0) params.delete("agents");
      else params.set("agents", next.agentIds.join(","));
      if (next.channelKeys === "all" || next.channelKeys.length === 0) params.delete("channels");
      else params.set("channels", next.channelKeys.join(","));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <main className="p-6 flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s how your team is doing this week.
          </p>
        </div>
        <DashboardFiltersBar value={filters} onChange={setFilters} />
      </header>

      {/* Row 1 — Stat cards (not yet filterable; DB-backed) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Messages"
          value={stats.totalMessages.value.toLocaleString()}
          icon={MessageSquare}
          gradient="gradient-blue"
          leftLabel="Inbound"
          leftValue={stats.totalMessages.inbound}
          rightLabel="Outbound"
          rightValue={stats.totalMessages.outbound}
          trendPct={stats.totalMessages.trendPct}
        />
        <StatCard
          title="Unread"
          value={stats.unread.value}
          icon={MailOpen}
          gradient="gradient-pink"
          leftLabel="Assigned"
          leftValue={stats.unread.assigned}
          rightLabel="Unassigned"
          rightValue={stats.unread.unassigned}
        />
        <StatCard
          title="Active Conversations"
          value={stats.active.value}
          icon={MessagesSquare}
          gradient="gradient-orange"
          leftLabel="Open"
          leftValue={stats.active.open}
          rightLabel="Snoozed"
          rightValue={stats.active.snoozed}
        />
        <StatCard
          title="Resolved Today"
          value={stats.resolvedToday.value}
          icon={CheckCircle2}
          gradient="gradient-purple"
          leftLabel="Resolved"
          leftValue={stats.resolvedToday.resolved}
          rightLabel="Escalated"
          rightValue={stats.resolvedToday.escalated}
          trendPct={stats.resolvedToday.trendPct}
        />
      </section>

      {/* Row 2 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MessageVolumeChart filterQuery={query} />
        <ResponseTimeChart filterQuery={query} />
      </section>

      {/* Row 3 */}
      <section>
        <ActivityByChannelCard filterQuery={query} />
      </section>

      {/* Row 4 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AgentPerformanceCard filterQuery={query} highlightAgentIds={filters.agentIds} />
        <ChannelMixCard filterQuery={query} />
        <LatestActivityCard pusherChannel={null} filterQuery={query} />
      </section>
    </main>
  );
}
