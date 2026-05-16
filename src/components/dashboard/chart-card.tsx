import { ChevronDown, Settings as SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  dropdownLabel,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  dropdownLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-surface border border-border rounded-xl shadow-sm", className)}>
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {dropdownLabel && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-canvas text-text-secondary hover:bg-surface hover:border-border-strong"
            >
              {dropdownLabel}
              <ChevronDown size={12} />
            </button>
          )}
          <button
            type="button"
            aria-label="Settings"
            className="w-7 h-7 rounded-md text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>
      <div className="px-5 pb-5 pt-2">{children}</div>
    </div>
  );
}
