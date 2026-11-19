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
  hideShipping = true,
  settlement,
}: {
  title: string;
  snapshot: InvoiceSnapshot | (Omit<InvoiceSnapshot, "serviceFeePercent" | "serviceFeeThb"> & {
    serviceFeePercent?: number;
    serviceFeeThb?: number;
  });
  weightKg?: number;
  /** Hide the Thai shipping row when shipping is already shown on each item. */
  hideShipping?: boolean;
  /** After a line is cancelled: fee drops that item's share, amount due is what remains, paid is the original bill. */
  settlement?: {
    amountDueThb: number;
    amountDueMmk: number;
    paidThb: number;
    paidMmk: number;
    feeThb: number;
    feeMmk: number;
  };
}) {
  const thbTotal = snapshot.thbSubtotal + snapshot.thbShipping;
  const discountThb = "discountThb" in snapshot ? (snapshot.discountThb ?? 0) : 0;
  const feePercent = snapshot.serviceFeePercent ?? 0;
  const feeThb = settlement ? settlement.feeThb : (snapshot.serviceFeeThb ?? 0);
  const feeMmk = settlement ? settlement.feeMmk : snapshot.serviceFeeMmk;
  const feeLabel = feePercent > 0 ? `Supplier fee (${feePercent}%)` : "Supplier fee";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      {settlement ? null : hideShipping ? (
        <MoneyRow label="Subtotal (THB)" thb={thbTotal} />
      ) : (
        <>
          <MoneyRow label="Subtotal (THB)" thb={snapshot.thbSubtotal} />
          <MoneyRow label="Thai shipping" thb={snapshot.thbShipping} />
          <MoneyRow label="THB total" thb={thbTotal} bold />
        </>
      )}
      {discountThb > 0 && <MoneyRow label="Discount" thb={-discountThb} />}
      {feePercent > 0 && (
        <MoneyRow label={`${feeLabel} (THB)`} thb={feeThb} mmk={feeMmk} />
      )}
      {!feePercent && <MoneyRow label="Supplier fee (MMK)" mmk={feeMmk} />}
      <p className="text-xs text-muted-foreground">Rate locked: 1 THB = {snapshot.rate} MMK</p>
      {weightKg !== undefined && (
        <p className="text-xs text-muted-foreground">Chargeable weight: {weightKg} kg</p>
      )}
      <MoneyRow
        label="Amount due"
        thb={
          settlement
            ? settlement.amountDueThb
            : snapshot.thbSubtotal > 0 || snapshot.thbShipping > 0 || feeThb > 0
              ? productInvoiceThbAmountDue({ ...snapshot, serviceFeeThb: feeThb, discountThb })
              : undefined
        }
        mmk={settlement ? settlement.amountDueMmk : snapshot.mmkTotal}
        bold
      />
      {settlement ? <MoneyRow label="Paid" thb={settlement.paidThb} mmk={settlement.paidMmk} /> : null}
    </div>
  );
}
