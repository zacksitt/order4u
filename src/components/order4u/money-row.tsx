import { productInvoiceThbAmountDue } from "@/lib/product-invoice-calc";
import { cn } from "@/lib/utils";
import type { InvoiceSnapshot } from "@/lib/types";

type MoneyRowProps = {
  label: string;
  thb?: number;
  mmk?: number;
  bold?: boolean;
  className?: string;
};

function fmtThb(n: number) {
  return `฿${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtMmk(n: number) {
  return `${n.toLocaleString("en-US")} MMK`;
}

export function MoneyRow({ label, thb, mmk, bold, className }: MoneyRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 text-sm", className)}>
      <span className={cn("text-muted-foreground", bold && "text-foreground font-medium")}>
        {label}
      </span>
      <div className={cn("text-right", bold && "font-semibold")}>
        {thb !== undefined && <div>{fmtThb(thb)}</div>}
        {mmk !== undefined && <div className="text-muted-foreground">{fmtMmk(mmk)}</div>}
      </div>
    </div>
  );
}

export function InvoiceBlock({
  title,
  snapshot,
  weightKg,
}: {
  title: string;
  snapshot: InvoiceSnapshot | (Omit<InvoiceSnapshot, "serviceFeePercent" | "serviceFeeThb"> & {
    serviceFeePercent?: number;
    serviceFeeThb?: number;
  });
  weightKg?: number;
}) {
  const thbTotal = snapshot.thbSubtotal + snapshot.thbShipping;
  const feePercent = snapshot.serviceFeePercent ?? 0;
  const feeThb = snapshot.serviceFeeThb ?? 0;
  const feeLabel = feePercent > 0 ? `Agent fee (${feePercent}%)` : "Agent service fee";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <MoneyRow label="Subtotal (THB)" thb={snapshot.thbSubtotal} />
      <MoneyRow label="TH shipping (THB)" thb={snapshot.thbShipping} />
      <MoneyRow label="THB total" thb={thbTotal} bold />
      {feePercent > 0 && (
        <MoneyRow label={`${feeLabel} (THB)`} thb={feeThb} mmk={snapshot.serviceFeeMmk} />
      )}
      {!feePercent && <MoneyRow label="Service fee (MMK)" mmk={snapshot.serviceFeeMmk} />}
      <p className="text-xs text-muted-foreground">Rate locked: 1 THB = {snapshot.rate} MMK</p>
      {weightKg !== undefined && (
        <p className="text-xs text-muted-foreground">Chargeable weight: {weightKg} kg</p>
      )}
      <MoneyRow
        label="Amount due"
        thb={
          snapshot.thbSubtotal > 0 || snapshot.thbShipping > 0 || feeThb > 0
            ? productInvoiceThbAmountDue({ ...snapshot, serviceFeeThb: feeThb })
            : undefined
        }
        mmk={snapshot.mmkTotal}
        bold
      />
    </div>
  );
}
