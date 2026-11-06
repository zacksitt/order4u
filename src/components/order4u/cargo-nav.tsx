"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/order4u/notification-bell";
import { logout } from "@/server/actions/auth";
import type { NotificationFeed } from "@/server/queries/notifications";

export function CargoNav({ notifications }: { notifications: NotificationFeed }) {
  const pathname = usePathname();
  const onOrders = pathname.startsWith("/cargo/orders");
  const onCategories = pathname.startsWith("/cargo/categories");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/cargo/orders" className="font-bold text-primary shrink-0">
          Order4U Cargo
        </Link>
        <div className="flex items-center gap-3">
          <NotificationBell items={notifications.items} unreadCount={notifications.unreadCount} />
          <Link
            href="/cargo/orders"
            className={`text-xs font-medium ${onOrders ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Orders
          </Link>
          <Link
            href="/cargo/categories"
            className={`text-xs font-medium ${onCategories ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Categories
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
