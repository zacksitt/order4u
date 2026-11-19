"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CARGO_NAV_LINKS, isCargoNavActive } from "@/lib/cargo-nav-links";
import { cn } from "@/lib/utils";
import { logout } from "@/server/actions/auth";

export function CargoBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 items-end px-4">
        {CARGO_NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isCargoNavActive(pathname, href);
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
        <form action={logout} className="justify-self-end">
          <button
            type="submit"
            className="flex min-w-[72px] flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
