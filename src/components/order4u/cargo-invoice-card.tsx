import { fmtMmk, fmtThb } from "@/lib/format-money";
import type { Order } from "@/lib/types";

/** Issued cargo invoice: one row per category, then subtotal, discount, and total. */
export function CargoInvoiceBreakdown({ invoice }: { invoice: NonNullable<Order["cargoInvoice"]> }) {
  const subtotal = invoice.subtotalThb ?? invoice.thbTotal;

  return (
    <div className="flex flex-col gap-2 text-sm">
      {invoice.lines.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <div className="min-w-[28rem]">
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_5rem_5.5rem] gap-2 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <span>Category</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Weight</span>
            <span className="text-right">THB / kg</span>
            <span className="text-right">Total</span>
          </div>
          {invoice.lines.map((line) => (
            <div
              key={line.categoryName}
              className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.5rem_5rem_5.5rem] gap-2 border-t border-border px-3 py-2"
            >
              <span className="min-w-0 break-words">{line.categoryName}</span>
              <span className="text-right tabular-nums">{line.qty}</span>
              <span className="text-right tabular-nums">{line.weightKg} kg</span>
              <span className="text-right tabular-nums">{fmtThb(line.unitPriceThb)}</span>
              <span className="text-right tabular-nums">{fmtThb(line.totalThb)}</span>
            </div>
          ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1 pt-1 text-[13px] text-slate-600">
        <Row label="Chargeable weight" value={`${invoice.weightKg} kg`} />
        {subtotal != null && <Row label="Subtotal" value={fmtThb(subtotal)} />}
        {invoice.discountThb > 0 && <Row label="Discount" value={`− ${fmtThb(invoice.discountThb)}`} />}
      </div>
      <div className="flex items-baseline justify-between border-t border-dashed border-slate-300 pt-2">
        <span className="text-[15px] font-semibold">Total due</span>
        <span className="text-right">
          {invoice.thbTotal != null && (
            <span className="block text-lg font-bold tabular-nums">{fmtThb(invoice.thbTotal)}</span>
          )}
          <span className="block text-xs text-muted-foreground tabular-nums">{fmtMmk(invoice.mmkTotal)}</span>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
