"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { OrderProgress } from "@/components/order4u/order-progress";
import { StatusPill } from "@/components/order4u/status-pill";
import { Button } from "@/components/ui/button";
import { fmtThb } from "@/lib/format-money";
import { isProductPaid } from "@/lib/payment-status";
import type { ItemStatus, Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  issueCargoInvoice,
  markCargoPaid,
  markCargoReceived,
  markDelivered,
  markInTransit,
  submitCargoCheck,
} from "@/server/actions/cargo-orders";

const ITEM_PILL: Record<ItemStatus, { label: string; className: string }> = {
  pending_purchase: { label: "To buy", className: "bg-slate-100 text-slate-600" },
  purchased: { label: "Purchased", className: "bg-cyan-100 text-teal-800" },
  seller_shipped: { label: "Shipped", className: "bg-cyan-100 text-teal-800" },
  arrived_at_agent: { label: "At agent", className: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
};

function fmtMmk(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} MMK`;
}

type NextKind = "receive" | "check" | "invoice" | "paid" | "transit" | "deliver" | "none";

function cargoNext(order: Order): { kind: NextKind; tone: "warn" | "teal" | "calm"; title: string; hint: string } {
  if (order.fulfillment === "handed_to_cargo") {
    return {
      kind: "receive",
      tone: "teal",
      title: "Mark cargo received",
      hint: "Confirm the shipment arrived at the warehouse.",
    };
  }
  if (order.fulfillment === "cargo_received" || order.fulfillment === "cargo_checking") {
    return {
      kind: "check",
      tone: "teal",
      title: "Complete warehouse check",
      hint: "Uncheck any line that does not match, then finish the check.",
    };
  }
  if (
    (order.fulfillment === "cargo_check_ok" || order.fulfillment === "cargo_check_exception") &&
    !order.cargoInvoice
  ) {
    return {
      kind: "invoice",
      tone: "warn",
      title: "Issue cargo invoice",
      hint: "Enter the chargeable weight and the MMK amount due.",
    };
  }
  if (order.cargoPaymentStatus === "awaiting") {
    return {
      kind: "paid",
      tone: "warn",
      title: "Confirm cargo payment",
      hint: "Mark paid after the customer transfer arrives.",
    };
  }
  if (order.fulfillment === "cargo_invoiced") {
    return {
      kind: "transit",
      tone: "teal",
      title: "Ship to Myanmar",
      hint: "Mark the order in transit once cargo is paid.",
    };
  }
  if (order.fulfillment === "in_transit") {
    return {
      kind: "deliver",
      tone: "teal",
      title: "Mark delivered",
      hint: "Confirm the customer has the shipment.",
    };
  }
  if (order.fulfillment === "delivered") {
    return { kind: "none", tone: "calm", title: "Nothing to do", hint: "This order is delivered." };
  }
  return {
    kind: "none",
    tone: "calm",
    title: "Waiting on the agent",
    hint: "This order has not been handed to cargo yet.",
  };
}

export function CargoOrderDetail({ order }: { order: Order }) {
  const router = useRouter();
  const [tab, setTab] = useState<"order" | "invoice">("order");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(() =>
    order.items.map((item) => ({ itemId: item.id, checkOk: item.checkOk ?? true })),
  );
  const [weightKg, setWeightKg] = useState(order.cargoInvoice ? String(order.cargoInvoice.weightKg) : "");
  const [mmkDue, setMmkDue] = useState(order.cargoInvoice ? String(order.cargoInvoice.mmkTotal) : "");

  const paid = isProductPaid(order.productPaymentStatus);
  const next = cargoNext(order);
  const atAgent = order.items.filter((item) => item.status === "arrived_at_agent").length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Failed");
      else router.refresh();
    });
  }

  function issueInvoice() {
    const weight = Number(weightKg);
    const mmk = Math.round(Number(mmkDue));
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(mmk) || mmk <= 0) {
      setError("Enter a weight and an MMK amount.");
      return;
    }
    run(() => issueCargoInvoice({ orderId: order.id, chargeableWeightKg: weight, mmkTotalDue: mmk }));
  }

  const cargoLabel =
    order.cargoPaymentStatus === "paid"
      ? "Paid"
      : order.cargoPaymentStatus === "awaiting"
        ? "Awaiting"
        : "Not invoiced yet";

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
      <Link
        href="/cargo/queue"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-teal-800"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
        Queue
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{order.code}</h1>
            <StatusPill
              productPaymentStatus={order.productPaymentStatus}
              cargoPaymentStatus={order.cargoPaymentStatus}
              fulfillment={order.fulfillment}
            />
          </div>
          <p className="mt-1.5 text-sm text-slate-600">{order.customerName}</p>
        </div>
        {order.productInvoice && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-[22px] font-bold tabular-nums">{fmtMmk(order.productInvoice.mmkTotal)}</p>
          </div>
        )}
      </header>

      <OrderProgress order={order} />

      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-[14px] border p-5",
          next.tone === "warn" && "border-amber-300 bg-amber-50",
          next.tone === "teal" && "border-teal-300 bg-teal-50",
          next.tone === "calm" && "border-border bg-card",
        )}
      >
        <div className="min-w-0 flex-1 basis-[280px]">
          <p
            className={cn(
              "text-xs font-semibold tracking-wide uppercase",
              next.tone === "warn" && "text-amber-800",
              next.tone === "teal" && "text-teal-700",
              next.tone === "calm" && "text-slate-600",
            )}
          >
            Next step
          </p>
          <h2 className="mt-1 text-[19px] font-bold">{next.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{next.hint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {next.kind === "receive" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => markCargoReceived(order.id))}
            >
              Mark received
            </Button>
          )}
          {next.kind === "check" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => submitCargoCheck({ orderId: order.id, items: checks }))}
            >
              Complete check
            </Button>
          )}
          {next.kind === "invoice" && (
            <>
              <label className="sr-only" htmlFor="cargo-weight">
                Weight kg
              </label>
              <input
                id="cargo-weight"
                inputMode="decimal"
                placeholder="Weight kg"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className="h-12 w-28 rounded-xl border border-input bg-white px-3 text-sm"
              />
              <label className="sr-only" htmlFor="cargo-mmk">
                MMK due
              </label>
              <input
                id="cargo-mmk"
                inputMode="numeric"
                placeholder="MMK due"
                value={mmkDue}
                onChange={(event) => setMmkDue(event.target.value)}
                className="h-12 w-32 rounded-xl border border-input bg-white px-3 text-sm"
              />
              <Button
                className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
                disabled={pending}
                onClick={issueInvoice}
              >
                Issue invoice
              </Button>
            </>
          )}
          {next.kind === "paid" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => markCargoPaid(order.id))}
            >
              Mark cargo paid
            </Button>
          )}
          {next.kind === "transit" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending || order.cargoPaymentStatus !== "paid"}
              onClick={() => run(() => markInTransit(order.id))}
            >
              Mark in transit
            </Button>
          )}
          {next.kind === "deliver" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => markDelivered(order.id))}
            >
              Mark delivered
            </Button>
          )}
        </div>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </section>

      <div role="tablist" aria-label="Order sections" className="flex gap-8 border-b border-border">
        {(
          [
            ["order", "Order"],
            ["invoice", "Invoice"],
          ] as const
        ).map(([key, label]) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px min-h-11 border-b-[3px] px-0.5 text-[15px]",
                on ? "border-teal-600 font-bold text-foreground" : "border-transparent font-medium text-slate-500",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "order" ? (
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-[14px] border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-[18px] py-3.5">
              <h2 className="text-[15px] font-semibold">Items</h2>
              <span className="text-[13px] text-slate-600">
                {atAgent} of {order.items.length} at agent
              </span>
            </div>
            <ul>
              {order.items.map((item) => {
                const pill = ITEM_PILL[item.status];
                const checked = checks.find((row) => row.itemId === item.id)?.checkOk ?? true;
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3.5 border-b border-slate-100 px-[18px] py-3.5 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full",
                        item.checkOk ? "bg-teal-600 text-white" : "border-2 border-slate-300 bg-white",
                      )}
                    >
                      {item.checkOk && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                    </span>
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {item.qty} × {fmtThb(item.price)}
                        {item.checkOk === false ? " · exception" : item.checkOk ? " · check ok" : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        pill.className,
                      )}
                    >
                      {pill.label}
                    </span>
                    {next.kind === "check" && (
                      <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setChecks((prev) =>
                              prev.map((row) =>
                                row.itemId === item.id ? { ...row, checkOk: event.target.checked } : row,
                              ),
                            )
                          }
                        />
                        OK
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-600">
            <span>
              Product:{" "}
              <strong className={paid ? "text-emerald-800" : "text-amber-800"}>{paid ? "Paid" : "Awaiting"}</strong>
            </span>
            <span>
              Cargo: <strong className="text-foreground">{cargoLabel}</strong>
            </span>
          </div>
        </div>
      ) : (
        <CargoInvoicePanels order={order} />
      )}
    </div>
  );
}

function CargoInvoicePanels({ order }: { order: Order }) {
  const invoice = order.productInvoice;
  const cargo = order.cargoInvoice;
  const cargoPay = order.cargoPaymentStatus === "paid" ? "Paid" : "Awaiting payment";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Product invoice</h2>
        {invoice ? (
          <>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span>
                  {item.qty}× {item.title}
                </span>
                <span className="tabular-nums whitespace-nowrap">{fmtThb(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5 text-[13px] text-slate-600">
              <MoneyRow label="Subtotal + Thai shipping" value={fmtThb(invoice.thbSubtotal + invoice.thbShipping)} />
              <MoneyRow label={`Service fee (${invoice.serviceFeePercent}%)`} value={fmtThb(invoice.serviceFeeThb)} />
              <MoneyRow label="Rate (locked)" value={`1 THB = ${invoice.rate} MMK`} />
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-slate-300 pt-2.5">
              <span className="text-[15px] font-semibold">Total due</span>
              <span className="text-xl font-bold tabular-nums">{fmtMmk(invoice.mmkTotal)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No product invoice yet.</p>
        )}
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-semibold">Cargo invoice</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cargo ? `${cargo.weightKg} kg · ${cargoPay}` : "Appears after the warehouse check."}
          </p>
        </div>
        {cargo && <p className="text-xl font-bold tabular-nums">{fmtMmk(cargo.mmkTotal)}</p>}
      </section>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
