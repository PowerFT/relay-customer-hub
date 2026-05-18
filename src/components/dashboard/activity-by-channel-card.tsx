"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { WorldMap } from "@/components/dashboard/world-map";
import type { ChannelRegion, MapBubble } from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

type Toggle = "Volume" | "Response Time";

export function ActivityByChannelCard({ filterQuery = "" }: { filterQuery?: string }) {
  const [toggle, setToggle] = useState<Toggle>("Volume");
  const qs = filterQuery ? `?${filterQuery}` : "";

  const bubblesQ = useQuery({
    queryKey: ["dashboard", "map-bubbles", filterQuery],
    queryFn: async (): Promise<{ bubbles: MapBubble[] }> => {
      const res = await fetch(`/api/dashboard/map-bubbles${qs}`);
      if (!res.ok) throw new Error(`map-bubbles ${res.status}`);
      return res.json();
    },
  });

  const regionsQ = useQuery({
    queryKey: ["dashboard", "channel-regions", filterQuery],
    queryFn: async (): Promise<{ regions: ChannelRegion[] }> => {
      const res = await fetch(`/api/dashboard/channel-regions${qs}`);
      if (!res.ok) throw new Error(`channel-regions ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm">
      <div className="flex items-start justify-between px-5 pt-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary">Activity by Channel</h3>
          <p className="text-xs text-text-secondary mt-0.5">Volume distribution worldwide</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex bg-canvas rounded-lg p-0.5 text-xs">
            {(["Volume", "Response Time"] as Toggle[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setToggle(t)}
                className={cn(
                  "px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                  toggle === t
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-canvas text-text-secondary hover:bg-surface"
          >
            Week
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            aria-label="More"
            className="w-7 h-7 rounded-md text-text-secondary hover:bg-canvas hover:text-text-primary flex items-center justify-center"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      <div className="px-5 pb-5 pt-2">
        <div className="grid grid-cols-3 gap-6 items-start">
          {/* Left 2/3: world map */}
          <div className="col-span-2">
            {bubblesQ.isLoading ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-text-tertiary">
                Loading…
              </div>
            ) : bubblesQ.isError ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-danger">
                Failed to load map data.
              </div>
            ) : (
              <WorldMap bubbles={bubblesQ.data?.bubbles ?? []} />
            )}
          </div>
          {/* Right 1/3: top channels list */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold mb-3.5">
              Top channels by volume
            </h4>
            <div className="flex flex-col gap-3.5">
              {(regionsQ.data?.regions ?? []).map((r) => (
                <RegionRow key={r.id} region={r} />
              ))}
              {regionsQ.isLoading && (
                <div className="text-xs text-text-tertiary">Loading…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionRow({ region }: { region: ChannelRegion }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: region.color }}
            aria-hidden
          />
          {region.name}
        </span>
        <span className="text-[13px] font-semibold text-text-primary">{region.pct}%</span>
      </div>
      <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${region.pct}%`, background: region.color }}
        />
      </div>
    </div>
  );
}
