"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/server/actions/auth";

export function CargoNav() {
  const pathname = usePathname();
  const onQueue = pathname.startsWith("/cargo/queue");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/cargo/queue" className="font-bold text-primary shrink-0">
          Order4U Cargo
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/cargo/queue"
            className={`text-xs font-medium ${onQueue ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Queue
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
