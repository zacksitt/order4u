"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { HandToCargoPanel } from "@/components/order4u/hand-to-cargo-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CargoStaffUser, ItemStatus, Order } from "@/lib/types";
import { canHandOrderToCargo } from "@/lib/order-rules";
import { isProductPaid } from "@/lib/payment-status";
import { ITEM_STATUS_LABEL } from "@/lib/status-labels";
import { markProductPaid, updateOrderItemStatus } from "@/server/actions/agent-orders";

type AgentOrderActionsProps = {
  order: Order;
  cargoUsers: CargoStaffUser[];
};

const ITEM_STATUSES: ItemStatus[] = [
  "pending_purchase",
  "purchased",
  "seller_shipped",
  "arrived_at_agent",
  "cancelled",
];

export function AgentOrderActions({ order, cargoUsers }: AgentOrderActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);

  const readyForCargo = canHandOrderToCargo(order);

  function markPaid() {
    setError(null);
    startTransition(async () => {
      const result = await markProductPaid(order.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!isProductPaid(order.productPaymentStatus) && (
        <Button size="sm" className="justify-start" onClick={markPaid} disabled={pending}>
          Mark product paid
        </Button>
      )}
      {isProductPaid(order.productPaymentStatus) && (
        <Button
          size="sm"
          variant="secondary"
          className="justify-start"
          onClick={() => setShowItems((v) => !v)}
        >
          {showItems ? "Hide item statuses" : "Update item statuses"}
        </Button>
      )}
      {showItems && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {order.items.map((item) => (
            <ItemStatusRow key={item.id} orderId={order.id} item={item} disabled={pending} />
          ))}
        </div>
      )}
      {(readyForCargo || order.assignedCargoUserId) && (
        <HandToCargoPanel order={order} cargoUsers={cargoUsers} />
      )}
      {order.fulfillment === "cargo_invoiced" && order.cargoPaymentStatus === "awaiting" && (
        <Button variant="outline" size="sm" className="justify-start" disabled>
          Forward cargo invoice in chat (copy from customer link)
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ItemStatusRow({
  orderId,
  item,
  disabled,
}: {
  orderId: string;
  item: Order["items"][number];
  disabled: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateOrderItemStatus({
        orderId,
        itemId: item.id,
        status,
        actualPrice: actualPrice === "" ? undefined : Number(actualPrice),
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm font-medium truncate">{item.title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ItemStatus)}
            disabled={disabled || pending}
          >
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Actual price (THB/unit)</Label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={actualPrice}
            onChange={(e) => setActualPrice(e.target.value)}
            disabled={disabled || pending}
          />
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={save} disabled={disabled || pending}>
        Save line
      </Button>
    </div>
  );
}
