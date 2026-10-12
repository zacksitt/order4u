"use client";

import { ProductInvoiceCard } from "@/components/order4u/product-invoice-card";
import { orderItemsToInvoiceLines } from "@/lib/invoice-display";
import { isProductPaid } from "@/lib/payment-status";
import type { Order } from "@/lib/types";

type AgentOrderInvoiceTabProps = {
  order: Order;
  shopName?: string;
};

export function AgentOrderInvoiceTab({ order, shopName }: AgentOrderInvoiceTabProps) {
  const lines = orderItemsToInvoiceLines(order.items);

  if (order.productInvoice) {
    return (
      <div className="space-y-3">
        <ProductInvoiceCard
          title={
            isProductPaid(order.productPaymentStatus)
              ? "Product invoice (issued)"
              : "Product invoice — send to customer"
          }
          snapshot={order.productInvoice}
          lines={lines}
          orderCode={order.code}
          shopName={shopName}
          customerName={order.customerName}
          publicToken={order.publicToken}
        />
        {!isProductPaid(order.productPaymentStatus) && (
          <p className="text-sm text-muted-foreground">
            Download the PDF and send it in chat. Mark product paid on the Workflow tab after the customer
            transfers MMK.
          </p>
        )}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">No product invoice yet.</p>;
}
