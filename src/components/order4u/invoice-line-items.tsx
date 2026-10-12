import { fmtThb, fmtThbLine } from "@/lib/format-money";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { cn } from "@/lib/utils";

type InvoiceLineItemsProps = {
  lines: InvoiceLineDisplay[];
  className?: string;
  compact?: boolean;
};

export function InvoiceLineItems({ lines, className, compact }: InvoiceLineItemsProps) {
  if (lines.length === 0) return null;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium text-right w-24">Qty</th>
            <th className="px-3 py-2 font-medium text-right w-32">Line (THB)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={`${line.title}-${i}`} className="border-b border-border last:border-0">
              <td className={cn("px-3 py-2.5 font-medium", compact && "text-xs")}>{line.title}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{line.qty}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {compact ? fmtThb(line.price * line.qty) : fmtThbLine(line.price, line.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
