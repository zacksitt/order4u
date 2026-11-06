"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { OrderProgress } from "@/components/order4u/order-progress";
import { StatusPill } from "@/components/order4u/status-pill";
import { Button } from "@/components/ui/button";
import { CargoInvoiceBreakdown } from "@/components/order4u/cargo-invoice-card";
import { cargoCategoryLines, roundThb } from "@/lib/cargo-fee";
import { fmtThb } from "@/lib/format-money";
import { isProductPaid } from "@/lib/payment-status";
import { ITEM_STATUS_CLASS, ITEM_STATUS_LABEL } from "@/lib/status-labels";
import type { ItemCategory, Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  assignItemCategories,
  issueCargoInvoice,
  markCargoPaid,
  markCargoReceived,
  markDelivered,
  markInTransit,
} from "@/server/actions/cargo-orders";

function parseAmounts(inputs: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, raw] of Object.entries(inputs)) {
    const value = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(value) && value >= 0) out[id] = value;
  }
  return out;
}

function fmtMmk(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} MMK`;
}

type NextKind = "receive" | "invoice" | "paid" | "transit" | "deliver" | "none";

function cargoNext(order: Order): { kind: NextKind; tone: "warn" | "teal" | "calm"; title: string; hint: string } {
  if (order.fulfillment === "handed_to_cargo") {
    return {
      kind: "receive",
      tone: "teal",
      title: "Received",
      hint: "Confirm the shipment arrived at the warehouse.",
    };
  }
  if (
    (order.fulfillment === "cargo_received" ||
      order.fulfillment === "cargo_checking" ||
      order.fulfillment === "cargo_check_ok" ||
      order.fulfillment === "cargo_check_exception") &&
    !order.cargoInvoice
  ) {
    return {
      kind: "invoice",
      tone: "warn",
      title: "Create invoice",
      hint: "Enter the weight for each category below. Price per kg comes from the category and you can change it for this order.",
    };
  }
  if (order.cargoPaymentStatus === "awaiting") {
    return {
      kind: "paid",
      tone: "warn",
      title: "Customer paid",
      hint: "Tap Customer paid after the transfer arrives.",
    };
  }
  if (order.fulfillment === "cargo_invoiced") {
    return {
      kind: "transit",
      tone: "teal",
      title: "Send to Myanmar",
      hint: "Tap Send to Myanmar after cargo is paid.",
    };
  }
  if (order.fulfillment === "in_transit") {
    return {
      kind: "deliver",
      tone: "teal",
      title: "Delivered",
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

export function CargoOrderDetail({
  order,
  categories,
}: {
  order: Order;
  categories: ItemCategory[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"order" | "invoice">("order");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((item) => [item.id, item.categoryId ?? ""])),
  );
  const categoriesDirty = order.items.some((item) => (categoryIds[item.id] ?? "") !== (item.categoryId ?? ""));
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [discountInput, setDiscountInput] = useState("");

  const priceByCategoryId = useMemo(() => parseAmounts(priceInputs), [priceInputs]);
  const weightByCategoryId = useMemo(() => parseAmounts(weightInputs), [weightInputs]);
  const invoiceDraft = useMemo(
    () => cargoCategoryLines(order.items, categories, categoryIds, weightByCategoryId, priceByCategoryId),
    [order.items, categories, categoryIds, weightByCategoryId, priceByCategoryId],
  );
  const discount = discountInput.trim() === "" ? 0 : Number(discountInput);
  const draftTotal = roundThb(invoiceDraft.subtotal - (Number.isFinite(discount) ? discount : 0));
  const rate = order.productInvoice?.rate;

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

  function saveCategories() {
    return assignItemCategories({
      orderId: order.id,
      items: order.items.map((item) => ({ itemId: item.id, categoryId: categoryIds[item.id] || null })),
    });
  }

  function issueInvoice() {
    setError(null);
    if (invoiceDraft.missing > 0) {
      setError("Choose a category for every item first.");
      return;
    }
    if (invoiceDraft.lines.some((line) => line.weightKg <= 0)) {
      setError("Enter the weight in kg for every category.");
      return;
    }
    if (Object.values(priceInputs).some((raw) => raw.trim() !== "" && !(Number(raw) > 0))) {
      setError("Category prices must be greater than 0.");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0) {
      setError("Discount must be 0 or more.");
      return;
    }
    if (draftTotal <= 0) {
      setError("Discount must be less than the subtotal.");
      return;
    }
    run(async () => {
      if (categoriesDirty) {
        const saved = await saveCategories();
        if (!saved.ok) return saved;
      }
      return issueCargoInvoice({
        orderId: order.id,
        categoryLines: invoiceDraft.lines.map((line) => ({
          categoryId: line.categoryId,
          weightKg: line.weightKg,
          unitPriceThb: line.unitPriceThb,
        })),
        discountThb: discount,
      });
    });
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
        href="/cargo/orders"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-teal-800"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
        Orders
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
              Received
            </Button>
          )}
          {next.kind === "paid" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => markCargoPaid(order.id))}
            >
              Customer paid
            </Button>
          )}
          {next.kind === "transit" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending || order.cargoPaymentStatus !== "paid"}
              onClick={() => run(() => markInTransit(order.id))}
            >
              Send to Myanmar
            </Button>
          )}
          {next.kind === "deliver" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              disabled={pending}
              onClick={() => run(() => markDelivered(order.id))}
            >
              Delivered
            </Button>
          )}
        </div>
        {error && next.kind !== "invoice" && <p className="w-full text-sm text-destructive">{error}</p>}
      </section>

      {next.kind === "invoice" && (
        <section className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Cargo invoice</h2>

          {invoiceDraft.lines.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Choose a category for each item in the list below to build the invoice.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_5.5rem_6rem_5.5rem] gap-2 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Category</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Weight (kg)</span>
                <span className="text-right">THB / kg</span>
                <span className="text-right">Total</span>
              </div>
              {invoiceDraft.lines.map((line) => {
                const defaultPrice = categories.find((c) => c.id === line.categoryId)?.cargoPriceThb;
                return (
                  <div
                    key={line.categoryId}
                    className="grid grid-cols-[minmax(0,1fr)_2.5rem_5.5rem_6rem_5.5rem] items-center gap-2 border-t border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words">{line.categoryName}</span>
                    <span className="text-right tabular-nums">{line.qty}</span>
                    <input
                      aria-label={`Weight in kg for ${line.categoryName}`}
                      inputMode="decimal"
                      placeholder="0.0"
                      value={weightInputs[line.categoryId] ?? ""}
                      onChange={(event) =>
                        setWeightInputs((prev) => ({ ...prev, [line.categoryId]: event.target.value }))
                      }
                      className="h-9 w-full rounded-lg border border-input bg-white px-2 text-right text-sm tabular-nums"
                    />
                    <input
                      aria-label={`Price per kg for ${line.categoryName}`}
                      inputMode="decimal"
                      value={priceInputs[line.categoryId] ?? String(defaultPrice ?? line.unitPriceThb)}
                      onChange={(event) =>
                        setPriceInputs((prev) => ({ ...prev, [line.categoryId]: event.target.value }))
                      }
                      className="h-9 w-full rounded-lg border border-input bg-white px-2 text-right text-sm tabular-nums"
                    />
                    <span className="text-right tabular-nums">{fmtThb(line.totalThb)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {invoiceDraft.missing > 0 && invoiceDraft.lines.length > 0 && (
            <p className="text-[13px] text-amber-800">
              {invoiceDraft.missing} item{invoiceDraft.missing === 1 ? " has" : "s have"} no category yet.
            </p>
          )}

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3 text-slate-600">
              <span>Chargeable weight</span>
              <span className="tabular-nums">{invoiceDraft.totalWeightKg} kg</span>
            </div>
            <div className="flex justify-between gap-3 text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtThb(invoiceDraft.subtotal)}</span>
            </div>
            <label className="flex items-center justify-between gap-3 text-slate-600" htmlFor="cargo-discount">
              <span>Discount (THB)</span>
              <input
                id="cargo-discount"
                inputMode="decimal"
                placeholder="0"
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
                className="h-9 w-28 rounded-lg border border-input bg-white px-2 text-right text-sm tabular-nums"
              />
            </label>
            <div className="flex items-baseline justify-between border-t border-dashed border-slate-300 pt-2">
              <span className="text-[15px] font-semibold">Total due</span>
              <span className="text-right">
                <span className="block text-lg font-bold tabular-nums">{fmtThb(Math.max(draftTotal, 0))}</span>
                {rate ? (
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    ≈ {fmtMmk(Math.round(Math.max(draftTotal, 0) * rate))} at 1 THB = {rate} MMK
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          <Button
            className="h-12 min-h-12 self-end rounded-xl px-[22px] text-[15px] font-semibold"
            disabled={pending}
            onClick={issueInvoice}
          >
            Create invoice
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>
      )}

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
                {atAgent} of {order.items.length} arrived
              </span>
            </div>
            <ul>
              {order.items.map((item) => {
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3.5 border-b border-slate-100 px-[18px] py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">Qty {item.qty}</p>
                    </div>
                    {!order.cargoInvoice && (
                      <label className="flex min-w-[160px] flex-col gap-1 text-[13px] font-semibold text-slate-700">
                        Category
                        <select
                          value={categoryIds[item.id] ?? ""}
                          onChange={(event) =>
                            setCategoryIds((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                          className="h-10 rounded-lg border border-input bg-white px-2 text-sm font-medium"
                        >
                          <option value="">None</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name} · {fmtThb(category.cargoPriceThb)}/kg
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {order.cargoInvoice && item.categoryName && (
                      <span className="text-[13px] text-slate-600">{item.categoryName}</span>
                    )}
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        ITEM_STATUS_CLASS[item.status],
                      )}
                    >
                      {ITEM_STATUS_LABEL[item.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
            {!order.cargoInvoice && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3.5">
                <p className="text-[13px] text-slate-600">
                  {categoriesDirty
                    ? "Unsaved category changes. They are also saved when you issue the cargo invoice."
                    : "Each item's category sets its line on the cargo invoice."}
                </p>
                {categoriesDirty && (
                  <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(saveCategories)}>
                    Save categories
                  </Button>
                )}
              </div>
            )}
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
  const cargo = order.cargoInvoice;
  const cargoPay = order.cargoPaymentStatus === "paid" ? "Paid" : "Awaiting payment";

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Cargo invoice</h2>
        {cargo && <span className="text-[13px] font-semibold text-slate-600">{cargoPay}</span>}
      </div>
      {cargo ? (
        <CargoInvoiceBreakdown invoice={cargo} />
      ) : (
        <p className="text-[13px] text-muted-foreground">Issue it from Next step after cargo is received.</p>
      )}
    </section>
  );
}
