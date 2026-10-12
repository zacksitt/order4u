"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCargoPaid } from "@/lib/payment-status";
import { ITEM_STATUS_LABEL } from "@/lib/status-labels";
import type { Order } from "@/lib/types";
import {
  issueCargoInvoice,
  markCargoPaid,
  markCargoReceived,
  markDelivered,
  markInTransit,
  submitCargoCheck,
} from "@/server/actions/cargo-orders";

type CargoWorkflowPanelProps = {
  order: Order;
};

export function CargoWorkflowPanel({ order }: CargoWorkflowPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(() =>
    order.items.map((i) => ({ itemId: i.id, checkOk: i.checkOk ?? true })),
  );
  const [weightKg, setWeightKg] = useState(
    order.cargoInvoice ? String(order.cargoInvoice.weightKg) : "2.4",
  );
  const [mmkDue, setMmkDue] = useState(
    order.cargoInvoice ? String(order.cargoInvoice.mmkTotal) : "45000",
  );

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Failed");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm font-medium">Warehouse check</p>
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-2 border-b border-border pb-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                Qty {item.qty} · {ITEM_STATUS_LABEL[item.status]}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs shrink-0">
              <input
                type="checkbox"
                checked={checks.find((c) => c.itemId === item.id)?.checkOk ?? true}
                onChange={(e) =>
                  setChecks((prev) =>
                    prev.map((c) => (c.itemId === item.id ? { ...c, checkOk: e.target.checked } : c)),
                  )
                }
              />
              OK
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {order.fulfillment === "handed_to_cargo" && (
          <Button size="sm" disabled={pending} onClick={() => run(() => markCargoReceived(order.id))}>
            Mark received
          </Button>
        )}
        {["handed_to_cargo", "cargo_received", "cargo_checking"].includes(order.fulfillment) && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !!order.cargoInvoice}
            onClick={() => run(() => submitCargoCheck({ orderId: order.id, items: checks }))}
          >
            Complete check
          </Button>
        )}
        {!order.cargoInvoice &&
          ["cargo_check_ok", "cargo_check_exception"].includes(order.fulfillment) && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">MMK due</Label>
                  <Input value={mmkDue} onChange={(e) => setMmkDue(e.target.value)} />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    issueCargoInvoice({
                      orderId: order.id,
                      chargeableWeightKg: Number(weightKg) || 0,
                      mmkTotalDue: Math.round(Number(mmkDue) || 0),
                    }),
                  )
                }
              >
                Issue cargo invoice
              </Button>
            </div>
          )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !isCargoPaid(order.cargoPaymentStatus)}
          onClick={() => run(() => markInTransit(order.id))}
        >
          Mark in transit
        </Button>
        {order.fulfillment === "in_transit" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markDelivered(order.id))}>
            Mark delivered
          </Button>
        )}
        {order.cargoPaymentStatus === "awaiting" && (
          <Button size="sm" className="mt-2" disabled={pending} onClick={() => run(() => markCargoPaid(order.id))}>
            Mark cargo paid
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
