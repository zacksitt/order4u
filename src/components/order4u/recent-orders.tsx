"use client";

import { useState } from "react";

import { OrderCard } from "@/components/order4u/order-card";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting pay" },
  { key: "buying", label: "Buying" },
  { key: "cargo", label: "At cargo" },
  { key: "shipping", label: "Shipping" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function atCargo(fulfillment: Order["fulfillment"]): boolean {
  return fulfillment === "handed_to_cargo" || fulfillment.startsWith("cargo_");
}

function matches(order: Order, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "awaiting") return order.productPaymentStatus !== "paid";
  if (filter === "buying") {
    return (
      order.productPaymentStatus === "paid" &&
      (order.fulfillment === "collecting" || order.fulfillment === "ready_for_cargo")
    );
  }
  if (filter === "cargo") return order.productPaymentStatus === "paid" && atCargo(order.fulfillment);
  return order.fulfillment === "in_transit";
}

export function RecentOrders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const visible = orders.filter((order) => matches(order, filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
        {FILTERS.map((item) => {
          const count = orders.filter((order) => matches(order, item.key)).length;
          const on = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(item.key)}
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
            <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
