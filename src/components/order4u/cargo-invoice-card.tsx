import { Download } from "lucide-react";
import Link from "next/link";

import { InvoiceBlock } from "@/components/order4u/money-row";
import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { Button } from "@/components/ui/button";
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
        <Button asChild variant="outline" className="w-full sm:w-auto" size="sm">
          <Link href={cargoInvoicePdfUrl(publicToken)} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download cargo invoice PDF
          </Link>
        </Button>
      )}
    </div>
  );
}
