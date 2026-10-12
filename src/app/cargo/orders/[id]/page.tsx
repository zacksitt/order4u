import Link from "next/link";
import { notFound } from "next/navigation";

import { CargoWorkflowPanel } from "@/components/order4u/cargo-workflow-panel";
import { InvoiceBlock } from "@/components/order4u/money-row";
import { ProductInvoiceCard } from "@/components/order4u/product-invoice-card";
import { PageHeader } from "@/components/order4u/page-header";
import { PaymentBadges } from "@/components/order4u/payment-badges";
import { StatusPill } from "@/components/order4u/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtThbLine } from "@/lib/format-money";
import { orderItemsToInvoiceLines } from "@/lib/invoice-display";
import { isProductPaid } from "@/lib/payment-status";
import { FULFILLMENT_LABEL, ITEM_STATUS_LABEL } from "@/lib/status-labels";
import { getCargoOrderById } from "@/server/queries/orders";

type PageProps = { params: Promise<{ id: string }> };

export default async function CargoOrderPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getCargoOrderById(id);
  if (!order) notFound();

  const itemCount = order.items.length;
  const lines = orderItemsToInvoiceLines(order.items);

  return (
    <>
      <PageHeader
        title={order.code}
        description={`${itemCount} item${itemCount !== 1 ? "s" : ""} · ${FULFILLMENT_LABEL[order.fulfillment]}`}
        action={
          <StatusPill
            productPaymentStatus={order.productPaymentStatus}
            cargoPaymentStatus={order.cargoPaymentStatus}
            fulfillment={order.fulfillment}
          />
        }
      />
      <PaymentBadges
        productPaymentStatus={order.productPaymentStatus}
        cargoPaymentStatus={order.cargoPaymentStatus}
        className="mb-6"
      />

      <Tabs defaultValue="workflow">
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="invoice">Invoices</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4 lg:max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                Product payment:{" "}
                <span className="font-medium">
                  {isProductPaid(order.productPaymentStatus) ? "Confirmed" : "Awaiting (agent)"}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                Contact the buying agent for customer or packing questions — customer phone is not shown here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Warehouse workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <CargoWorkflowPanel order={order} />
              <p className="text-xs text-muted-foreground pt-4">
                Status: {FULFILLMENT_LABEL[order.fulfillment]}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4 lg:max-w-xl">
          {order.productInvoice ? (
            <ProductInvoiceCard
              title="Product invoice (reference)"
              snapshot={order.productInvoice}
              lines={lines}
              orderCode={order.code}
              showDownload={false}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No product invoice on this order.</p>
          )}

          {order.cargoInvoice ? (
            <InvoiceBlock
              title="Cargo invoice"
              snapshot={order.cargoInvoice}
              weightKg={order.cargoInvoice.weightKg}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Issue cargo invoice from Workflow after check.</p>
          )}

          <p className="text-xs text-muted-foreground">
            Agent forwards the cargo invoice to the customer on the shared track link after you issue it.
          </p>
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          {order.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Quoted: {fmtThbLine(item.price, item.qty)}
                    </p>
                    {item.checkOk !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Check: {item.checkOk ? "OK" : "Exception"}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {ITEM_STATUS_LABEL[item.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />

      <Button asChild variant="ghost" size="sm">
        <Link href="/cargo/queue">← Back to queue</Link>
      </Button>
    </>
  );
}
