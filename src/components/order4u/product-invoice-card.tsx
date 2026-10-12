import { Download } from "lucide-react";
import Link from "next/link";

import { InvoiceBlock } from "@/components/order4u/money-row";
import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { Button } from "@/components/ui/button";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { productInvoicePdfUrl } from "@/lib/invoice-display";
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
}: ProductInvoiceCardProps) {
  const canDownload = showDownload && publicToken;

  return (
    <div className="space-y-4">
      {(shopName || orderCode || customerName) && (
        <div className="text-sm space-y-0.5">
          {shopName && <p className="font-semibold">{shopName}</p>}
          {orderCode && <p className="text-muted-foreground">Order {orderCode}</p>}
          {customerName && <p className="text-muted-foreground">Customer: {customerName}</p>}
        </div>
      )}

      <InvoiceLineItems lines={lines} />

      <InvoiceBlock title={title} snapshot={snapshot} />

      {canDownload && (
        <Button asChild variant="outline" className="w-full sm:w-auto" size="sm">
          <Link href={productInvoicePdfUrl(publicToken)} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download product invoice PDF
          </Link>
        </Button>
      )}
    </div>
  );
}
