import { CheckCircle2, MailOpen, MessageSquare, MessagesSquare } from "lucide-react";

import { ComingSoonCard } from "@/components/dashboard/coming-soon-card";
import { LatestActivityCard } from "@/components/dashboard/latest-activity-card";
import { MessageVolumeChart } from "@/components/dashboard/message-volume-chart";
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { getCurrentUser } from "@/lib/auth";
import { fetchStats } from "@/lib/dashboard/stats";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const stats = await fetchStats({ range: "7d", locationId: "all" });

  return (
    <main className="p-6 flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Inbox snapshot — last 7 days. Activity feed lands in Row 22.
        </p>
      </header>

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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MessageVolumeChart />
        <ResponseTimeChart />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ComingSoonCard
          title="Agent Performance"
          body="Handled-conversations and avg response time per agent."
        />
        <ComingSoonCard
          title="Channel Mix"
          body="Donut breakdown by channel."
        />
        <LatestActivityCard pusherChannel={null} />
      </section>
    </main>
  );
}
