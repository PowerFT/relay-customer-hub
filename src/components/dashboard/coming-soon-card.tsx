import { ChartCard } from "@/components/dashboard/chart-card";

export function ComingSoonCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <ChartCard title={title} dropdownLabel="Week">
      <div className="h-[180px] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-sm font-medium text-text-secondary">{body}</p>
          <p className="text-xs text-text-tertiary mt-1">Live data coming soon.</p>
        </div>
      </div>
    </ChartCard>
  );
}
