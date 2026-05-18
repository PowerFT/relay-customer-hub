"use client";

import { ChevronDown, Globe, Users } from "lucide-react";
import { useState } from "react";

import { CHANNEL_ICONS, type ChannelIconKey } from "@/components/conversations/channel-icons";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENTS, CHANNEL_INSTANCES } from "@/lib/dashboard/mock-data";
import { cn } from "@/lib/utils";

/**
 * Two URL-synced multi-select dropdowns shown on the dashboard page header.
 *
 * Wire format mirrors the API contract used by every chart card's request:
 *   ?agents=sara,tom                                  (or unset = all)
 *   ?channels=whatsapp:loc_dubai,webchat:loc_main     (or unset = all)
 *
 * The parent owns the URL via `value` + `onChange` so refresh and deep
 * links preserve the selection.
 */

export type FilterValue = {
  agentIds: string[] | "all";
  channelKeys: string[] | "all";
};

export function DashboardFiltersBar({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AgentFilter
        value={value.agentIds}
        onChange={(agentIds) => onChange({ ...value, agentIds })}
      />
      <ChannelFilter
        value={value.channelKeys}
        onChange={(channelKeys) => onChange({ ...value, channelKeys })}
      />
    </div>
  );
}

// ─── Agent filter ─────────────────────────────────────────────────────────

function AgentFilter({
  value,
  onChange,
}: {
  value: string[] | "all";
  onChange: (next: string[] | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const isAll = value === "all";
  const selected = isAll ? [] : value;

  const label = isAll
    ? "All agents"
    : selected.length === 1
      ? AGENTS.find((a) => a.id === selected[0])?.name ?? "1 agent"
      : `${selected.length} agents`;

  const toggle = (id: string) => {
    if (isAll) {
      onChange([id]);
      return;
    }
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next.length === 0 ? "all" : next);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border border-border bg-surface text-text-primary hover:bg-canvas transition-colors",
          !isAll && "border-primary/30 bg-primary-soft/40",
        )}
      >
        <Users size={14} className="text-text-secondary" />
        <span>{label}</span>
        <ChevronDown size={12} className="text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onChange("all")}
          className="text-[13px]"
        >
          <span className={cn("flex-1", isAll && "font-semibold")}>All agents</span>
          {isAll && <span className="text-primary text-xs">●</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {AGENTS.map((agent) => (
          <DropdownMenuCheckboxItem
            key={agent.id}
            closeOnClick={false}
            checked={!isAll && selected.includes(agent.id)}
            onCheckedChange={() => toggle(agent.id)}
            className="text-[13px]"
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-text-primary"
              style={{ background: agent.tone }}
            >
              {agent.initials}
            </span>
            <span>{agent.name}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Channel filter ───────────────────────────────────────────────────────

type ChannelGroup = {
  channel: string;
  channelLabel: string;
  instances: typeof CHANNEL_INSTANCES;
};

function groupByChannel(): ChannelGroup[] {
  const byChannel = new Map<string, ChannelGroup>();
  for (const inst of CHANNEL_INSTANCES) {
    const label =
      inst.channel.charAt(0).toUpperCase() + inst.channel.slice(1);
    const g = byChannel.get(inst.channel);
    if (g) g.instances.push(inst);
    else
      byChannel.set(inst.channel, {
        channel: inst.channel,
        channelLabel: label,
        instances: [inst],
      });
  }
  return [...byChannel.values()];
}
const CHANNEL_GROUPS = groupByChannel();

function ChannelFilter({
  value,
  onChange,
}: {
  value: string[] | "all";
  onChange: (next: string[] | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const isAll = value === "all";
  const selected = new Set(isAll ? [] : value);

  const label = isAll
    ? "All channels"
    : selected.size === 1
      ? CHANNEL_INSTANCES.find((c) => selected.has(c.key))?.displayName ?? "1 channel"
      : `${selected.size} channels`;

  const toggleInstance = (key: string) => {
    if (isAll) {
      onChange([key]);
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next.size === 0 ? "all" : [...next]);
  };

  const toggleGroup = (group: ChannelGroup) => {
    const groupKeys = group.instances.map((i) => i.key);
    const allSelected = groupKeys.every((k) => selected.has(k));
    const next = new Set(isAll ? [] : selected);
    if (allSelected) {
      for (const k of groupKeys) next.delete(k);
    } else {
      for (const k of groupKeys) next.add(k);
    }
    onChange(next.size === 0 ? "all" : [...next]);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border border-border bg-surface text-text-primary hover:bg-canvas transition-colors",
          !isAll && "border-primary/30 bg-primary-soft/40",
        )}
      >
        <Globe size={14} className="text-text-secondary" />
        <span>{label}</span>
        <ChevronDown size={12} className="text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-72">
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => onChange("all")}
          className="text-[13px]"
        >
          <span className={cn("flex-1", isAll && "font-semibold")}>All channels</span>
          {isAll && <span className="text-primary text-xs">●</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {CHANNEL_GROUPS.map((group) => {
          const groupKeys = group.instances.map((i) => i.key);
          const allInGroup = !isAll && groupKeys.every((k) => selected.has(k));
          const someInGroup =
            !isAll && groupKeys.some((k) => selected.has(k)) && !allInGroup;
          const Icon = CHANNEL_ICONS[group.channel as ChannelIconKey] ?? CHANNEL_ICONS.all;
          return (
            <DropdownMenuGroup key={group.channel}>
              <DropdownMenuLabel
                className="flex items-center gap-2 mt-1 cursor-pointer hover:bg-accent rounded-md"
                onClick={() => toggleGroup(group)}
              >
                <span
                  className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-white flex-shrink-0"
                  style={{
                    background:
                      group.instances[0]?.color ?? "var(--color-primary)",
                  }}
                >
                  <Icon size={9} />
                </span>
                <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide">
                  {group.channelLabel}
                </span>
                {allInGroup && (
                  <span className="text-[10px] text-primary font-bold">ALL</span>
                )}
                {someInGroup && (
                  <span className="text-[10px] text-text-tertiary">PARTIAL</span>
                )}
              </DropdownMenuLabel>
              {group.instances.map((inst) => (
                <DropdownMenuCheckboxItem
                  key={inst.key}
                  closeOnClick={false}
                  checked={selected.has(inst.key)}
                  onCheckedChange={() => toggleInstance(inst.key)}
                  className="text-[13px] pl-7"
                >
                  <span className="text-text-secondary">{inst.displayName}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
