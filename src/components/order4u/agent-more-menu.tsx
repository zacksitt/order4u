"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/server/actions/auth";

import {
  AGENT_MOBILE_MORE,
  agentMobileMoreLinks,
  isAgentMoreMenuActive,
  isAgentNavActive,
} from "@/lib/agent-nav-links";
import { cn } from "@/lib/utils";

export function AgentMoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreActive = isAgentMoreMenuActive(pathname);
  const MoreIcon = AGENT_MOBILE_MORE.icon;
  const links = agentMobileMoreLinks();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={rootRef} className="relative flex flex-col items-center min-w-[72px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex flex-col items-center gap-1 py-3 text-xs font-medium",
          open || moreActive ? "text-primary" : "text-muted-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreIcon className="h-5 w-5" strokeWidth={open || moreActive ? 2.5 : 2} />
        {AGENT_MOBILE_MORE.label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {links.map(({ href, label, icon: Icon }) => {
            const active = isAgentNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
          <div className="my-1 border-t border-border" />
          <form action={logout} role="none">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
