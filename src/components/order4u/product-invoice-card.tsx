import type { ReactNode } from "react";

import { InvoiceBlock } from "@/components/order4u/money-row";
import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { PdfDownloadButton } from "@/components/order4u/pdf-download-button";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { productInvoicePdfUrl } from "@/lib/invoice-display";
import { productInvoiceThbAmountDue, remainingProductAmountDue } from "@/lib/product-invoice-calc";
import type { InvoiceSnapshot } from "@/lib/types";

type ProductInvoiceCardProps = {
  title: string;
  snapshot: InvoiceSnapshot;
  lines: InvoiceLineDisplay[];
  orderCode?: string;
  shopName?: string;
  customerName?: string;
  /** Public order token — enables PDF download */
  publicToken?: string;
  showDownload?: boolean;
  headerActions?: ReactNode;
};

export function ProductInvoiceCard({
  title,
  snapshot,
  lines,
  orderCode,
  shopName,
  customerName,
  publicToken,
  showDownload = true,
  headerActions,
}: ProductInvoiceCardProps) {
  const canDownload = showDownload && publicToken;
  const hasCancelled = lines.some((line) => line.cancelled);
  const due = hasCancelled ? remainingProductAmountDue(snapshot, lines) : null;

  return (
    <div className="space-y-4">
      {(shopName || orderCode || customerName) && (
        <div className="text-sm space-y-0.5">
          {shopName && <p className="font-semibold">{shopName}</p>}
          {orderCode && <p className="text-muted-foreground">Order {orderCode}</p>}
          {customerName && <p className="text-muted-foreground">Customer: {customerName}</p>}
        </div>
      )}

      {headerActions}

      <InvoiceLineItems lines={lines} />

      <InvoiceBlock
        title={title}
        snapshot={snapshot}
        hideShipping
        settlement={
          due
            ? {
                amountDueThb: due.thb,
                amountDueMmk: due.mmk,
                paidThb: productInvoiceThbAmountDue(snapshot),
                paidMmk: snapshot.mmkTotal,
                feeThb: due.serviceFeeThb,
                feeMmk: due.serviceFeeMmk,
              }
            : undefined
        }
      />

      {canDownload && (
        <PdfDownloadButton
          href={productInvoicePdfUrl(publicToken)}
          fallbackFilename={`${orderCode ?? "order"}-product-invoice.pdf`}
          label="Download product invoice PDF"
        />
      )}
    </div>
  );
}
