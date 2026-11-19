"use client";

import { useState } from "react";

import { OrderCard } from "@/components/order4u/order-card";
import { CARGO_ORDER_FILTERS } from "@/lib/cargo-order-filters";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 10;
const FILTERS = CARGO_ORDER_FILTERS.filter((filter) => filter.key !== "all");

export function CargoRecentOrders({ orders }: { orders: Order[] }) {
  const [key, setKey] = useState<(typeof FILTERS)[number]["key"] | "recent">("recent");
  const chips = [{ key: "recent" as const, label: "Recent", match: () => true }, ...FILTERS];
  const active = chips.find((chip) => chip.key === key) ?? chips[0];
  const visible = orders.filter(active.match).slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {chips.map((item) => {
          const count = Math.min(RECENT_LIMIT, orders.filter(item.match).length);
          const on = key === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={on}
              onClick={() => setKey(item.key)}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-[13px] font-semibold",
                on
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-muted",
              )}
            >
              {item.label} · {count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No open orders.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} href={`/cargo/orders/${order.id}`} audience="cargo" />
          ))}
        </div>
      )}
    </div>
  );
}
