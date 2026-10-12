import { InvoiceBlock } from "@/components/order4u/money-row";
import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { PdfDownloadButton } from "@/components/order4u/pdf-download-button";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { cargoInvoicePdfUrl } from "@/lib/invoice-display";
import type { InvoiceSnapshot } from "@/lib/types";

type CargoInvoiceCardProps = {
  snapshot: InvoiceSnapshot & { weightKg: number };
  lines: InvoiceLineDisplay[];
  orderCode?: string;
  publicToken?: string;
  title?: string;
};

export function CargoInvoiceCard({
  snapshot,
  lines,
  orderCode,
  publicToken,
  title = "Cargo invoice",
}: CargoInvoiceCardProps) {
  return (
    <div className="space-y-4">
      {orderCode && <p className="text-sm text-muted-foreground">Order {orderCode}</p>}
      <InvoiceLineItems lines={lines} compact />
      <InvoiceBlock title={title} snapshot={snapshot} weightKg={snapshot.weightKg} />
      {publicToken && (
        <PdfDownloadButton
          href={cargoInvoicePdfUrl(publicToken)}
          fallbackFilename={`${orderCode ?? "order"}-cargo-invoice.pdf`}
          label="Download cargo invoice PDF"
        />
      )}
    </div>
  );
}
