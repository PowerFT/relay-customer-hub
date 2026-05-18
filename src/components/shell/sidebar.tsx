"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-unread-count";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  showBadge?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversations", label: "Conversations", icon: MessageSquare, showBadge: true },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/broadcasts", label: "Broadcasts", icon: Inbox },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const COLLAPSED_KEY = "relay-sidebar-collapsed";

const COLLAPSED_LISTENERS = new Set<() => void>();
function subscribeCollapsed(cb: () => void) {
  COLLAPSED_LISTENERS.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === COLLAPSED_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    COLLAPSED_LISTENERS.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function readCollapsed() {
  return localStorage.getItem(COLLAPSED_KEY) === "1";
}
function writeCollapsed(value: boolean) {
  localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  COLLAPSED_LISTENERS.forEach((cb) => cb());
}

type SidebarUser = {
  name: string;
  role: string;
  initials: string;
  imageUrl?: string | null;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );

  const toggleCollapsed = useCallback(() => {
    writeCollapsed(!readCollapsed());
  }, []);

  return (
    <aside
      className={cn(
        "bg-sidebar-bg text-sidebar-text flex flex-col px-3 py-4 sticky top-0 h-screen flex-shrink-0 transition-[width] duration-150",
        collapsed ? "w-20" : "w-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-2 pb-4 mb-3.5 border-b border-white/5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--color-primary), #0AAE96)" }}
          aria-label="Relay logo"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base leading-tight">Relay</div>
            <div className="text-[11px] text-sidebar-text">Customer Hub</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto w-7 h-7 rounded-md text-sidebar-text hover:bg-sidebar-active hover:text-white flex items-center justify-center transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-[#5C6478] font-semibold">
          Workspace
        </div>
      )}

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-text hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-2",
              )}
            >
              {active && (
                <span
                  className="absolute -left-3 top-2 bottom-2 w-[3px] bg-primary rounded-r"
                  aria-hidden
                />
              )}
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.showBadge && unread > 0 && (
                <span className="ml-auto bg-unread-badge text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[22px] text-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto flex items-center gap-2.5 p-2.5 rounded-[10px] bg-white/[0.03]",
          collapsed && "justify-center",
        )}
      >
        <UserAvatar user={user} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-white text-[13px] font-semibold truncate">{user.name}</div>
            <div className="text-[11px] text-sidebar-text truncate">{user.role}</div>
          </div>
        )}
      </div>
    </aside>
  );
}

function UserAvatar({ user }: { user: SidebarUser }) {
  if (user.imageUrl) {
    return (
      <Image
        src={user.imageUrl}
        alt={user.name}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#A7CAF0] text-text-primary flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
      {user.initials}
    </div>
  );
}
