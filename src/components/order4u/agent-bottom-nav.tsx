"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AgentMoreMenu } from "@/components/order4u/agent-more-menu";
import {
  agentFabLink,
  agentMobileTabLinks,
  isAgentNavActive,
} from "@/lib/agent-nav-links";
import { cn } from "@/lib/utils";

export function AgentBottomNav() {
  const pathname = usePathname();
  const fab = agentFabLink();
  const tabs = agentMobileTabLinks().sort((a, b) => {
    const order = { start: 0, beforeFab: 1, end: 2 };
    return order[a.mobileTab!] - order[b.mobileTab!];
  });

  const startTabs = tabs.filter((t) => t.mobileTab !== "end");
  const FabIcon = fab?.icon;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 items-end px-4">
        {startTabs.map(({ href, label, icon: Icon }) => {
          const active = isAgentNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}

        {fab && FabIcon && (
          <Link
            href={fab.href}
            className="relative -top-4 flex flex-col items-center justify-self-center"
            aria-label={fab.label}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
              <FabIcon className="h-7 w-7" strokeWidth={2.5} />
            </span>
          </Link>
        )}

        <div className="justify-self-end">
          <AgentMoreMenu />
        </div>
      </div>
    </nav>
  );
}
