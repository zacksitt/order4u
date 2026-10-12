"use client";

import { Package } from "lucide-react";

import { InvoiceBlock } from "@/components/order4u/money-row";
import { ProductInvoiceCard } from "@/components/order4u/product-invoice-card";
import { orderItemsToInvoiceLines } from "@/lib/invoice-display";
import { OrderTimeline } from "@/components/order4u/order-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtThbLine } from "@/lib/format-money";
import { buildCustomerTimeline } from "@/lib/order-timeline";
import { isCargoPaid, isProductPaid } from "@/lib/payment-status";
import { ITEM_STATUS_LABEL, orderSummaryLabel } from "@/lib/status-labels";
import type { PublicOrder } from "@/lib/types";

type PublicOrderViewProps = {
  order: PublicOrder;
  shopName?: string;
};

function fmtMmk(n: number) {
  return `${n.toLocaleString("en-US")} MMK`;
}

export function PublicOrderView({ order, shopName = "Demo Shop" }: PublicOrderViewProps) {
  const showTracking = isProductPaid(order.productPaymentStatus);
  const summary = orderSummaryLabel(
    order.productPaymentStatus,
    order.fulfillment,
    order.cargoPaymentStatus,
  );
  const heroItem = order.items[0];
  const timeline = buildCustomerTimeline(order);

  if (!showTracking) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-b from-primary/20 to-background px-4 pt-6 pb-8">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
              {shopName}
            </p>
            <h1 className="mt-2 text-center text-2xl font-bold">{order.code}</h1>
          </div>
          <CardContent className="-mt-4 space-y-4 px-4 pb-6">
            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="p-4 text-sm">
                <p className="font-medium text-amber-900">Product invoice</p>
                <p className="mt-2 text-amber-800">
                  Pay the product invoice your agent sent in chat. Tracking appears here after payment
                  is confirmed.
                </p>
              </CardContent>
            </Card>
            {order.productInvoice && (
              <ProductInvoiceCard
                title="Amount due"
                snapshot={order.productInvoice}
                lines={orderItemsToInvoiceLines(order.items)}
                orderCode={order.code}
                shopName={shopName}
                customerName={order.customerName}
                showDownload={false}
              />
            )}
          </CardContent>
        </Card>
        <p className="text-center text-[10px] text-muted-foreground">
          Private link — do not share publicly. Phone number is not shown on this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-b from-primary/15 to-transparent px-2 pt-4 pb-2">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
          {shopName}
        </p>
        <h1 className="mt-1 text-center text-2xl font-bold">{order.code}</h1>
        <p className="text-center text-sm text-muted-foreground">Your order — no login required</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold truncate">{heroItem?.title ?? "Your items"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {summary}
              </Badge>
            </div>
            {order.productInvoice && (
              <p className="mt-2 text-lg font-bold text-primary">
                {fmtMmk(order.productInvoice.mmkTotal)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline steps={timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4 space-y-3">
          {order.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Qty {item.qty}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium tabular-nums">{fmtThbLine(item.price, item.qty)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ITEM_STATUS_LABEL[item.status]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          {order.productInvoice && (
            <ProductInvoiceCard
              title={
                isProductPaid(order.productPaymentStatus)
                  ? "Product invoice (paid)"
                  : "Product invoice"
              }
              snapshot={order.productInvoice}
              lines={orderItemsToInvoiceLines(order.items)}
              orderCode={order.code}
              shopName={shopName}
              customerName={order.customerName}
              showDownload={false}
            />
          )}
          {(order.fulfillment === "cargo_invoiced" ||
            order.cargoInvoice ||
            order.fulfillment === "in_transit" ||
            order.fulfillment === "delivered") && (
            <>
              <Separator />
              <InvoiceBlock
                title={
                  isCargoPaid(order.cargoPaymentStatus)
                    ? "Cargo invoice (paid)"
                    : "Cargo invoice — payment due"
                }
                snapshot={
                  order.cargoInvoice ?? {
                    thbSubtotal: 0,
                    thbShipping: 0,
                    rate: 0,
                    serviceFeeMmk: 0,
                    mmkTotal: 45000,
                  }
                }
                weightKg={order.cargoInvoice?.weightKg ?? 2.4}
              />
            </>
          )}
          {!order.cargoInvoice && order.fulfillment !== "cargo_invoiced" && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Cargo invoice will appear after warehouse check.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-center text-[10px] text-muted-foreground pt-2">
        Private link — do not share publicly. Phone number is not shown on this page.
      </p>
    </div>
  );
}
