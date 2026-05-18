import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardGradient =
  | "gradient-blue"
  | "gradient-pink"
  | "gradient-orange"
  | "gradient-purple";

export type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: StatCardGradient;
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
  /** Positive or negative percentage. 0 hides the trend chip. */
  trendPct?: number;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  trendPct = 0,
}: StatCardProps) {
  const total = leftValue + rightValue;
  const leftRatio = total > 0 ? (leftValue / total) * 100 : 0;
  const trendUp = trendPct > 0;

  return (
    <div
      className={cn(
        gradient,
        "relative p-5 rounded-2xl text-white shadow-md min-h-[168px] flex flex-col overflow-hidden",
      )}
    >
      {/* Decorative bubble */}
      <span
        className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"
        aria-hidden
      />

      <div className="flex justify-between items-start relative z-10">
        <span className="text-sm font-medium opacity-90 tracking-wide">{title}</span>
        <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center">
          <Icon size={20} />
        </div>
      </div>

      <div className="text-5xl font-bold tracking-tight mt-2 leading-tight relative z-10">
        {value}
      </div>

      {trendPct !== 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full mt-1.5 w-fit relative z-10">
          {trendUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(trendPct)}% vs prior
        </span>
      )}

      <div className="mt-auto pt-3.5 flex items-stretch gap-3 relative z-10">
        <div className="flex-1">
          <div className="text-[11px] opacity-85">{leftLabel}</div>
          <div className="text-lg font-bold">{leftValue}</div>
        </div>
        <div className="w-px bg-white/25" />
        <div className="flex-1">
          <div className="text-[11px] opacity-85">{rightLabel}</div>
          <div className="text-lg font-bold">{rightValue}</div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/20 z-10">
        <div className="h-full bg-white/70" style={{ width: `${leftRatio}%` }} />
      </div>
    </div>
  );
}
