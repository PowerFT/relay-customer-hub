"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import type { AgentPerf } from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

export function AgentPerformanceCard({
  filterQuery = "",
  highlightAgentIds,
}: {
  filterQuery?: string;
  /** "all" or a list — used purely to read whether highlighting applies. */
  highlightAgentIds?: string[] | "all";
}) {
  const qs = filterQuery ? `?${filterQuery}` : "";
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "agent-performance", filterQuery],
    queryFn: async (): Promise<{ agents: AgentPerf[] }> => {
      const res = await fetch(`/api/dashboard/agent-performance${qs}`);
      if (!res.ok) throw new Error(`agent-performance ${res.status}`);
      return res.json();
    },
  });
  // The API already marks each row with .highlighted, but the prop is
  // available for any local UX (e.g. dimming non-selected agents).
  void highlightAgentIds;

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm">
      <div className="flex items-start justify-between px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary">Agent Performance</h3>
          <p className="text-xs text-text-secondary mt-0.5">Volume + response quality</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-canvas text-text-secondary hover:bg-surface"
        >
          Week
          <ChevronDown size={12} />
        </button>
      </div>
      <div className="px-5 pb-5 pt-2">
        {isLoading ? (
          <p className="text-xs text-text-tertiary py-2">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {(data?.agents ?? []).map((a) => (
              <AgentRow key={a.id} agent={a} />
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-4 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Handled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF6B8A", opacity: 0.5 }} />
            Quality score
          </span>
        </div>
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentPerf }) {
  // Bars in the prototype are width = handled*2% and quality*0.7% — preserve
  // those scaling factors so the visual matches reference/dashboard.jsx.
  const handledWidth = Math.min(agent.handled * 2, 100);
  const qualityWidth = Math.min(agent.quality * 0.7, 100);

  return (
    <div
      className={cn(
        "grid grid-cols-[28px_1fr_56px] gap-3 items-center rounded-lg",
        agent.highlighted && "bg-primary-soft/40 -mx-2 px-2 py-1.5",
      )}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-text-primary"
        style={{ background: agent.tone }}
      >
        {agent.initials}
      </div>
      <div className="min-w-0">
        <div className="flex justify-between text-[13px] mb-1">
          <span className="font-medium truncate">{agent.name}</span>
          <span className="text-[11px] text-text-secondary font-normal flex-shrink-0">
            {agent.avg} avg
          </span>
        </div>
        <div className="relative h-1.5 bg-canvas rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 bg-primary rounded-full"
            style={{ width: `${handledWidth}%` }}
          />
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full"
            style={{ width: `${qualityWidth}%`, background: "#FF6B8A", opacity: 0.5 }}
          />
        </div>
      </div>
      <div className="text-right text-[13px] font-semibold">{agent.handled}</div>
    </div>
  );
}
