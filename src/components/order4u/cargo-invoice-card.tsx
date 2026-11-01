import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { PdfDownloadButton } from "@/components/order4u/pdf-download-button";
import { fmtCargoFee } from "@/lib/format-money";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { cargoInvoicePdfUrl } from "@/lib/invoice-display";

type CargoInvoiceCardProps = {
  lines: InvoiceLineDisplay[];
  weightKg: number;
  mmkTotal: number;
  thbTotal?: number;
  orderCode?: string;
  publicToken?: string;
  title?: string;
};

export function CargoInvoiceCard({
  lines,
  weightKg,
  mmkTotal,
  thbTotal,
  orderCode,
  publicToken,
  title = "Cargo invoice",
}: CargoInvoiceCardProps) {
  return (
    <div className="space-y-4">
      {orderCode && <p className="text-sm text-muted-foreground">Order {orderCode}</p>}
      <h3 className="font-semibold">{title}</h3>
      <InvoiceLineItems lines={lines} qtyOnly />
      <p className="text-sm text-muted-foreground">{weightKg} kg</p>
      <p className="text-lg font-bold tabular-nums">{fmtCargoFee({ thbTotal, mmkTotal })}</p>
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
