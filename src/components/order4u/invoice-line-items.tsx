import { fmtThb } from "@/lib/format-money";
import { lineShippingThb, lineTotalThb, type InvoiceLineDisplay } from "@/lib/invoice-display";
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

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium text-right w-14">Qty</th>
            {qtyOnly ? null : (
              <>
                <th className="px-3 py-2 font-medium text-right w-24">Price</th>
                <th className="px-3 py-2 font-medium text-right w-24">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const shipping = lineShippingThb(line);
            const total = lineTotalThb(line);
            const struck = line.cancelled ? "text-muted-foreground line-through" : "";
            return (
              <tr key={`${line.title}-${i}`} className="border-b border-border last:border-0">
                <td className={cn("px-3 py-2.5 font-medium break-words", compact && "text-xs")}>
                  <span className={cn("block", struck)}>{line.title}</span>
                  {line.cancelled ? (
                    <span className="mt-0.5 block text-xs font-semibold text-red-700">Cancelled</span>
                  ) : null}
                  {line.cancelled && line.cancelNote ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{line.cancelNote}</span>
                  ) : null}
                  {!qtyOnly && shipping > 0 && (
                    <span className={cn("mt-0.5 block text-xs font-normal text-muted-foreground", struck)}>
                      Shipping {fmtThb(shipping)}
                    </span>
                  )}
                </td>
                <td className={cn("px-3 py-2.5 text-right tabular-nums text-muted-foreground", struck)}>{line.qty}</td>
                {qtyOnly ? null : (
                  <>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", struck || undefined)}>{fmtThb(line.price)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums", struck || undefined)}>{fmtThb(total)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
