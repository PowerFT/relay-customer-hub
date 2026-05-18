"use client";

import { useMemo, useState } from "react";

import type { MapBubble } from "@/lib/dashboard/mock-data";

const CHANNEL_NAMES: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  webchat: "Webchat",
  email: "Email",
  sms: "SMS",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "var(--color-c-whatsapp)",
  messenger: "var(--color-c-messenger)",
  instagram: "var(--color-c-instagram)",
  tiktok: "var(--color-c-tiktok)",
  linkedin: "var(--color-c-linkedin)",
  webchat: "var(--color-c-webchat)",
  email: "var(--color-c-email)",
  sms: "var(--color-c-sms)",
};

type Region = [number, number, number, number, number];
const REGIONS: Region[] = [
  [80, 70, 170, 180, 0.55],   // North America
  [180, 170, 230, 280, 0.5],  // South America
  [225, 70, 285, 130, 0.55],  // Europe
  [240, 130, 305, 235, 0.5],  // Africa
  [285, 60, 405, 175, 0.45],  // Asia
  [370, 200, 430, 245, 0.45], // Oceania
];

/**
 * Pure dot generator. Seeded PRNG (seed = 42) — deterministic per re-render.
 * Lives outside the component so the React Compiler purity lint stays happy
 * with the mutable RNG state.
 */
function generateDots(): [number, number][] {
  const state = { s: 42 };
  const rnd = () => {
    state.s = (state.s * 1103515245 + 12345) % 2147483648;
    return state.s / 2147483648;
  };
  const pts: [number, number][] = [];
  for (const [x1, y1, x2, y2, d] of REGIONS) {
    const step = 9;
    for (let x = x1; x <= x2; x += step) {
      for (let y = y1; y <= y2; y += step) {
        if (rnd() < d) {
          const jx = x + (rnd() - 0.5) * 3;
          const jy = y + (rnd() - 0.5) * 3;
          pts.push([jx, jy]);
        }
      }
    }
  }
  return pts;
}

/**
 * Stylized dotted world map with channel-colored bubble pins, ported from
 * reference/dashboard.jsx WorldMap. The dot field is deterministic via a
 * seeded PRNG (seed = 42); re-renders produce the same map.
 */
export function WorldMap({ bubbles }: { bubbles: MapBubble[] }) {
  const dots = useMemo(() => generateDots(), []);

  const [hover, setHover] = useState<MapBubble | null>(null);

  return (
    <div className="relative w-full" style={{ height: 320 }}>
      <svg
        viewBox="40 50 410 230"
        width="100%"
        height={320}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.3} fill="var(--color-border-strong)" />
        ))}
        {bubbles.map((b, i) => {
          const col = CHANNEL_COLORS[b.channel] ?? "#9CA3AF";
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={b.x} cy={b.y} r={b.r} fill={col} fillOpacity={0.18} />
              <circle cx={b.x} cy={b.y} r={b.r * 0.5} fill={col} fillOpacity={0.85} />
              <circle cx={b.x} cy={b.y} r={2} fill="white" />
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="absolute bg-text-primary text-white text-xs font-semibold px-2.5 py-1.5 rounded-md pointer-events-none whitespace-nowrap"
          style={{
            left: `${((hover.x - 40) / 410) * 100}%`,
            top: `${((hover.y - 50) / 230) * 100}%`,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          {hover.country} · {CHANNEL_NAMES[hover.channel] ?? hover.channel} · {hover.count}
        </div>
      )}
    </div>
  );
}
