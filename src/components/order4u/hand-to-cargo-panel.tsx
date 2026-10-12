"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { canHandOrderToCargo, isHandedToCargo } from "@/lib/order-rules";
import type { CargoStaffUser, Order } from "@/lib/types";
import { handOrderToCargo } from "@/server/actions/agent-orders";

type HandToCargoPanelProps = {
  order: Order;
  cargoUsers: CargoStaffUser[];
};

export function HandToCargoPanel({ order, cargoUsers }: HandToCargoPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [cargoUserId, setCargoUserId] = useState(
    order.assignedCargoUserId ?? cargoUsers[0]?.id ?? "",
  );

  const assignee = useMemo(
    () => cargoUsers.find((u) => u.id === cargoUserId),
    [cargoUsers, cargoUserId],
  );

  if (order.assignedCargoUserId || isHandedToCargo(order.fulfillment)) {
    const id = order.assignedCargoUserId ?? cargoUserId;
    const name = cargoUsers.find((u) => u.id === id)?.displayName ?? "Cargo";
    return (
      <p className="text-xs text-muted-foreground">
        Assigned cargo: <span className="text-foreground font-medium">{name}</span>
        {order.fulfillment === "handed_to_cargo" ? " · handed over" : ""}
      </p>
    );
  }

  if (!canHandOrderToCargo(order)) return null;

  function onHandClick() {
    setError(null);
    if (!cargoUserId) {
      setError("Choose cargo staff.");
      return;
    }

    startTransition(async () => {
      const result = await handOrderToCargo({ orderId: order.id, cargoUserId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Label htmlFor="cargo-assignee">Assign cargo staff</Label>
      <select
        id="cargo-assignee"
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        value={cargoUserId}
        onChange={(e) => setCargoUserId(e.target.value)}
        disabled={pending || cargoUsers.length === 0}
      >
        {cargoUsers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.displayName}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        className="w-full justify-start"
        onClick={onHandClick}
        disabled={pending || cargoUsers.length === 0}
      >
        {pending ? "Saving…" : `Hand full order to ${assignee?.displayName ?? "cargo"}`}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
