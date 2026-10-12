"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { agentFabLink, agentSidebarLinks, isAgentNavActive } from "@/lib/agent-nav-links";
import { cn } from "@/lib/utils";
import { logout } from "@/server/actions/auth";

export function AgentSidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  const fab = agentFabLink();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-card md:shrink-0">
      <div className="border-b border-border px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Order4U</p>
        <p className="mt-1 text-sm font-medium">{shopName}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {agentSidebarLinks().map(({ href, label, icon: Icon }) => {
          const active = isAgentNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
        {fab && (
          <Link
            href={fab.href}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New order
          </Link>
        )}
      </nav>
      <form action={logout} className="border-t border-border p-3">
        <button type="submit" className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          Sign out
        </button>
      </form>
    </aside>
  );
}
