"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/server/actions/auth";

export function CustomerNav() {
  const pathname = usePathname();
  const onOrders = pathname.startsWith("/customer/orders") && !pathname.endsWith("/new");
  const onNew = pathname.endsWith("/new");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/customer/orders" className="font-bold text-primary shrink-0">
          Order4U
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/customer/orders"
            className={`text-xs font-medium ${onOrders ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            My orders
          </Link>
          <Link
            href="/customer/orders/new"
            className={`text-xs font-medium ${onNew ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            New order
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
