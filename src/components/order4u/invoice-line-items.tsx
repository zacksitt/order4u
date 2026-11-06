import { fmtThb, fmtThbLine } from "@/lib/format-money";
import {
  lineGoodsThb,
  lineShippingThb,
  lineTotalThb,
  type InvoiceLineDisplay,
} from "@/lib/invoice-display";
import { cn } from "@/lib/utils";

type InvoiceLineItemsProps = {
  lines: InvoiceLineDisplay[];
  className?: string;
  compact?: boolean;
  /** Cargo invoice lists the item and quantity only. */
  qtyOnly?: boolean;
};

export function InvoiceLineItems({ lines, className, compact, qtyOnly }: InvoiceLineItemsProps) {
  if (lines.length === 0) return null;
  const showShipping = lines.some((line) => lineShippingThb(line) > 0);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium text-right w-16">Qty</th>
            {qtyOnly ? null : (
              <th className="px-3 py-2 font-medium text-right w-28">{showShipping ? "Total" : "Line (THB)"}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const goods = lineGoodsThb(line);
            const shipping = lineShippingThb(line);
            const total = lineTotalThb(line);
            return (
              <tr key={`${line.title}-${i}`} className="border-b border-border last:border-0">
                <td className={cn("px-3 py-2.5 font-medium break-words", compact && "text-xs")}>
                  <span className="block">{line.title}</span>
                  {!qtyOnly && showShipping && (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Items {fmtThb(goods)}
                      {line.qty > 1 ? ` (${fmtThb(line.price)} × ${line.qty})` : ""}
                      {" + "}
                      shipping {fmtThb(shipping)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{line.qty}</td>
                {qtyOnly ? null : (
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {compact || showShipping ? fmtThb(total) : fmtThbLine(line.price, line.qty)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
