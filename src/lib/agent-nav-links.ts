import type { LucideIcon } from "lucide-react";
import { BarChart3, LayoutDashboard, MoreHorizontal, Package, PlusCircle, Settings } from "lucide-react";

export type AgentNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Center FAB on mobile (New order) */
  fab?: boolean;
  /** Primary bottom tab (mobile) */
  mobileTab?: "start" | "beforeFab" | "end";
  /** Shown inside mobile "More" menu only */
  mobileMore?: boolean;
  /** Listed in desktop sidebar (default true except fab / mobileMore-only) */
  sidebar?: boolean;
};

export const AGENT_NAV_LINKS: AgentNavLink[] = [
  {
    href: "/agent/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    mobileTab: "start",
    sidebar: true,
  },
  {
    href: "/agent/orders",
    label: "Orders",
    icon: Package,
    mobileTab: "beforeFab",
    sidebar: true,
  },
  {
    href: "/agent/orders/new",
    label: "New order",
    icon: PlusCircle,
    fab: true,
    sidebar: false,
  },
  {
    href: "/agent/reports",
    label: "Reports",
    icon: BarChart3,
    mobileMore: true,
    sidebar: true,
  },
  {
    href: "/agent/settings",
    label: "Settings",
    icon: Settings,
    mobileMore: true,
    sidebar: true,
  },
];

/** Pseudo-link for More button active state */
export const AGENT_MOBILE_MORE = {
  href: "__more__",
  label: "More",
  icon: MoreHorizontal,
  mobileTab: "end" as const,
};

export function isAgentNavActive(pathname: string, href: string): boolean {
  if (href === "/agent/orders") {
    return (
      pathname === href ||
      (pathname.startsWith("/agent/orders/") && pathname !== "/agent/orders/new")
    );
  }
  if (href === "/agent/dashboard") {
    return pathname === href || pathname === "/agent";
  }
  if (href === "/agent/reports") {
    return pathname.startsWith("/agent/reports");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAgentMoreMenuActive(pathname: string): boolean {
  return AGENT_NAV_LINKS.some(
    (l) => l.mobileMore && isAgentNavActive(pathname, l.href),
  );
}

export function agentSidebarLinks(): AgentNavLink[] {
  return AGENT_NAV_LINKS.filter((l) => l.sidebar !== false && !l.fab);
}

export function agentMobileTabLinks(): AgentNavLink[] {
  return AGENT_NAV_LINKS.filter((l) => l.mobileTab);
}

export function agentMobileMoreLinks(): AgentNavLink[] {
  return AGENT_NAV_LINKS.filter((l) => l.mobileMore);
}

export function agentFabLink(): AgentNavLink | undefined {
  return AGENT_NAV_LINKS.find((l) => l.fab);
}
