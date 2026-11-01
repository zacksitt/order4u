"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CopyLineButton } from "@/components/order4u/copy-line-button";
import { OrderProgress } from "@/components/order4u/order-progress";
import { PdfDownloadButton, PdfShareButton } from "@/components/order4u/pdf-download-button";
import { StatusPill } from "@/components/order4u/status-pill";
import { Button } from "@/components/ui/button";
import { fmtThb } from "@/lib/format-money";
import { productInvoicePdfUrl } from "@/lib/invoice-display";
import { allItemsArrived, canHandOrderToCargo, isHandedToCargo } from "@/lib/order-rules";
import { isProductPaid } from "@/lib/payment-status";
import type { CargoStaffUser, ItemStatus, Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { handOrderToCargo, markProductPaid, updateOrderItemStatus } from "@/server/actions/agent-orders";

const NEXT_STATUS: Partial<Record<ItemStatus, { status: ItemStatus; label: string }>> = {
  pending_purchase: { status: "purchased", label: "Mark bought" },
  purchased: { status: "seller_shipped", label: "Mark shipped" },
  seller_shipped: { status: "arrived_at_agent", label: "Mark arrived" },
};

const ITEM_PILL: Record<ItemStatus, { label: string; className: string }> = {
  pending_purchase: { label: "To buy", className: "bg-slate-100 text-slate-600" },
  purchased: { label: "Purchased", className: "bg-cyan-100 text-teal-800" },
  seller_shipped: { label: "Shipped", className: "bg-cyan-100 text-teal-800" },
  arrived_at_agent: { label: "At agent", className: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
};

type AgentOrderDetailProps = {
  order: Order;
  cargoUsers: CargoStaffUser[];
  trackUrl: string;
};

function fmtMmk(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} MMK`;
}

export function AgentOrderDetail({ order, cargoUsers, trackUrl }: AgentOrderDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"order" | "invoice">("order");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cargoUserId, setCargoUserId] = useState(
    order.assignedCargoUserId ?? cargoUsers[0]?.id ?? "",
  );

  const paid = isProductPaid(order.productPaymentStatus);
  const handed = isHandedToCargo(order.fulfillment);
  const atAgent = order.items.filter((item) => item.status === "arrived_at_agent").length;
  const assignee = cargoUsers.find((user) => user.id === (order.assignedCargoUserId ?? cargoUserId));

  const next = nextStep(order, atAgent, assignee?.displayName);

  function markPaid() {
    setError(null);
    startTransition(async () => {
      const result = await markProductPaid(order.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handOff() {
    setError(null);
    if (!cargoUserId) {
      setError("Choose cargo staff.");
      return;
    }
    startTransition(async () => {
      const result = await handOrderToCargo({ orderId: order.id, cargoUserId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/agent/orders"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-teal-800"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
        My orders
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
          <p className="mt-1.5 text-sm text-slate-600">
            {order.customerName} · {order.customerPhone}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {order.productInvoice && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-[22px] font-bold tabular-nums">{fmtMmk(order.productInvoice.mmkTotal)}</p>
            </div>
          )}
          {paid && (
            <CopyLineButton
              text={trackUrl}
              label="Copy customer link"
              className="h-11 w-auto min-h-11 rounded-[10px] px-4"
            />
          )}
        </div>
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
          {next.kind === "pay" && (
            <Button
              className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
              onClick={markPaid}
              disabled={pending}
            >
              Mark product paid
            </Button>
          )}
          {next.kind === "hand" && (
            <>
              <label className="sr-only" htmlFor="cargo-assignee">
                Cargo staff
              </label>
              <select
                id="cargo-assignee"
                className="h-12 rounded-xl border border-input bg-white px-3 text-sm"
                value={cargoUserId}
                onChange={(event) => setCargoUserId(event.target.value)}
                disabled={pending || cargoUsers.length === 0}
              >
                {cargoUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
              <Button
                className="h-12 min-h-12 rounded-xl px-[22px] text-[15px] font-semibold"
                onClick={handOff}
                disabled={pending || cargoUsers.length === 0}
              >
                Hand to cargo
              </Button>
            </>
          )}
          {next.kind === "copy" && (
            <CopyLineButton
              text={trackUrl}
              label="Copy customer link"
              className="h-12 w-auto min-h-12 rounded-xl border-0 bg-primary px-[22px] text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
            />
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
        <OrderChecklist order={order} atAgent={atAgent} paid={paid} handed={handed} assigneeName={assignee?.displayName} />
      ) : (
        <InvoicePanels order={order} />
      )}
    </div>
  );
}

function nextStep(order: Order, atAgent: number, cargoName: string | undefined) {
  const paid = isProductPaid(order.productPaymentStatus);
  const handed = isHandedToCargo(order.fulfillment);
  if (!paid) {
    return {
      kind: "pay" as const,
      tone: "warn" as const,
      title: "Confirm product payment",
      hint: "Tap when the customer’s transfer arrives.",
    };
  }
  if (!allItemsArrived(order.items)) {
    return {
      kind: "none" as const,
      tone: "teal" as const,
      title: `Buy items · ${atAgent} of ${order.items.length} at agent`,
      hint: "Tap the button on each item below as it moves along.",
    };
  }
  if (!handed && canHandOrderToCargo(order)) {
    return {
      kind: "hand" as const,
      tone: "teal" as const,
      title: "Hand order to cargo",
      hint: "All items are with you. Pick cargo staff and hand over.",
    };
  }
  if (order.fulfillment === "cargo_invoiced" && order.cargoPaymentStatus === "awaiting") {
    return {
      kind: "copy" as const,
      tone: "warn" as const,
      title: "Send cargo invoice to customer",
      hint: "Copy the link and paste it in chat.",
    };
  }
  if (order.fulfillment === "in_transit") {
    return {
      kind: "none" as const,
      tone: "calm" as const,
      title: "Nothing to do",
      hint: "Shipping to Myanmar. Cargo will mark it delivered.",
    };
  }
  return {
    kind: "none" as const,
    tone: "calm" as const,
    title: "Waiting for cargo",
    hint: `${cargoName ?? "Cargo"} is checking the order. You’ll get a notification.`,
  };
}

function OrderChecklist({
  order,
  atAgent,
  paid,
  handed,
  assigneeName,
}: {
  order: Order;
  atAgent: number;
  paid: boolean;
  handed: boolean;
  assigneeName?: string;
}) {
  const cargoLabel =
    order.cargoPaymentStatus === "paid"
      ? "Paid"
      : order.cargoPaymentStatus === "awaiting"
        ? "Awaiting"
        : "Not invoiced yet";

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-[18px] py-3.5">
          <h2 className="text-[15px] font-semibold">Items</h2>
          <span className="text-[13px] text-slate-600">
            {atAgent} of {order.items.length} at agent
          </span>
        </div>
        <ul>
          {order.items.map((item) => (
            <ItemRow key={item.id} orderId={order.id} item={item} locked={!paid || handed} />
          ))}
        </ul>
        {!paid && (
          <p className="bg-amber-50 px-[18px] py-3 text-[13px] text-amber-900">
            Buying unlocks after product payment.
          </p>
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
        <span>
          Cargo staff: <strong className="text-foreground">{handed ? (assigneeName ?? "Cargo") : "Not assigned"}</strong>
        </span>
      </div>
    </div>
  );
}

function ItemRow({
  orderId,
  item,
  locked,
}: {
  orderId: string;
  item: Order["items"][number];
  locked: boolean;
}) {
  const router = useRouter();
  const [actualPrice, setActualPrice] = useState(item.actualPrice?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const advance = NEXT_STATUS[item.status];
  const pill = ITEM_PILL[item.status];
  const arrived = item.status === "arrived_at_agent";

  function markNext() {
    if (!advance) return;
    setError(null);
    const price = actualPrice.trim() === "" ? undefined : Number(actualPrice);
    if (price !== undefined && !Number.isFinite(price)) {
      setError("Enter a THB amount.");
      return;
    }
    startTransition(async () => {
      const result = await updateOrderItemStatus({
        orderId,
        itemId: item.id,
        status: advance.status,
        actualPrice: price,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3.5 border-b border-slate-100 px-[18px] py-3.5 last:border-b-0">
      <span
        className={cn(
          "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full",
          arrived ? "bg-teal-600 text-white" : "border-2 border-slate-300 bg-white",
        )}
      >
        {arrived && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
      </span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-sm font-semibold">{item.title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {item.qty} × {fmtThb(item.price)}
          {item.actualPrice !== undefined ? ` · you paid ${fmtThb(item.actualPrice)}` : ""}
        </p>
      </div>
      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", pill.className)}>
        {pill.label}
      </span>
      {advance && (
        <>
          <input
            aria-label={`Amount paid for ${item.title}`}
            inputMode="decimal"
            placeholder="THB paid"
            value={actualPrice}
            onChange={(event) => setActualPrice(event.target.value)}
            disabled={locked || pending}
            className="h-10 w-24 rounded-[10px] border border-input bg-white px-2 text-[13px] disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={markNext}
            disabled={locked || pending}
            className={cn(
              "min-h-10 rounded-[10px] px-3.5 text-[13px] font-semibold whitespace-nowrap",
              locked
                ? "border-0 bg-slate-100 text-slate-500"
                : "border border-teal-700 bg-white text-teal-800",
            )}
          >
            {advance.label}
          </button>
        </>
      )}
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </li>
  );
}

function InvoicePanels({ order }: { order: Order }) {
  const invoice = order.productInvoice;
  const cargo = order.cargoInvoice;
  const cargoPay = order.cargoPaymentStatus === "paid" ? "Paid" : "Awaiting payment";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Product invoice</h2>
          {invoice && (
            <div className="flex flex-wrap justify-end gap-2">
              <PdfShareButton
                href={productInvoicePdfUrl(order.publicToken)}
                fallbackFilename={`${order.code}-product-invoice.pdf`}
                label="Share invoice"
                showIcon={false}
                className="h-10 w-auto min-h-10 rounded-[10px] px-3.5 text-[13px] font-semibold"
              />
              <PdfDownloadButton
                href={productInvoicePdfUrl(order.publicToken)}
                fallbackFilename={`${order.code}-product-invoice.pdf`}
                label="Download invoice"
                showIcon={false}
                className="h-10 w-auto min-h-10 rounded-[10px] px-3.5 text-[13px] font-semibold"
              />
            </div>
          )}
        </div>
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
