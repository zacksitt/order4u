"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { StaffNotification } from "@/server/queries/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";
import { cn } from "@/lib/utils";

const TITLE: Record<StaffNotification["type"], string> = {
  handed_to_cargo: "Order handed to you",
  cargo_invoice_ready: "Cargo invoice ready",
  check_exception: "Cargo check exception",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function isStaffHref(href: string): boolean {
  return href.startsWith("/agent/") || href.startsWith("/cargo/");
}

export function NotificationBell({
  items,
  unreadCount,
  align = "right",
}: {
  items: StaffNotification[];
  unreadCount: number;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function openItem(item: StaffNotification) {
    startTransition(async () => {
      await markNotificationRead(item.id);
      setOpen(false);
      if (isStaffHref(item.href)) {
        router.push(item.href);
        router.refresh();
      }
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={markAll}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                    onClick={() => openItem(item)}
                  >
                    <span className={cn("text-sm", item.read ? "text-muted-foreground" : "font-medium")}>
                      {TITLE[item.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.orderCode ? `${item.orderCode} · ` : ""}
                      {formatRelative(item.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
