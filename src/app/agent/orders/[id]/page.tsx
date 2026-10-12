import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyLineButton } from "@/components/order4u/copy-line-button";
import { AgentOrderInvoiceTab } from "@/components/order4u/agent-order-invoice-tab";
import { OrderTimeline } from "@/components/order4u/order-timeline";
import { PageHeader } from "@/components/order4u/page-header";
import { PaymentBadges } from "@/components/order4u/payment-badges";
import { StatusPill } from "@/components/order4u/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtThbLine } from "@/lib/format-money";
import { AgentOrderActions } from "@/components/order4u/agent-order-actions";
import { getAgentOrderById } from "@/server/queries/orders";
import { listCargoStaff } from "@/server/queries/users";
import { isProductPaid } from "@/lib/payment-status";
import { buildCustomerTimeline } from "@/lib/order-timeline";
import { CargoInvoiceCard } from "@/components/order4u/cargo-invoice-card";
import {
  cargoInvoicePdfUrl,
  orderItemsToInvoiceLines,
  productInvoicePdfUrl,
} from "@/lib/invoice-display";
import { FULFILLMENT_LABEL, ITEM_STATUS_LABEL } from "@/lib/status-labels";
import { getTenantSettingsForAgent } from "@/server/queries/tenant";
import { absolutePublicUrl } from "@/lib/app-url";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [order, cargoUsers, tenant] = await Promise.all([
    getAgentOrderById(id),
    listCargoStaff(),
    getTenantSettingsForAgent(),
  ]);
  if (!order) notFound();

  const trackPath = `/o/${order.publicToken}`;
  const trackUrl = absolutePublicUrl(trackPath);
  const canShowTrack = isProductPaid(order.productPaymentStatus);
  const customerTimeline = canShowTrack ? buildCustomerTimeline(order) : null;

  return (
    <>
      <PageHeader
        title={order.code}
        description={`${order.customerName} · ${order.customerPhone}`}
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

        <TabsContent value="workflow" className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:items-start">
          <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canShowTrack ? (
                <p className="text-sm text-muted-foreground">
                  Tracking URL is hidden until product invoice is marked paid (unless trusted early-buy
                  flow).
                </p>
              ) : (
                <>
                  <p className="break-all rounded-lg bg-muted px-3 py-2 text-xs font-mono">{trackUrl}</p>
                  <CopyLineButton text={trackUrl} label="Copy track & invoice link" />
                </>
              )}
              {order.productInvoice && (
                <Button asChild variant="outline" size="sm">
                  <Link href={productInvoicePdfUrl(order.publicToken)} target="_blank" rel="noopener noreferrer">
                    Download product invoice PDF
                  </Link>
                </Button>
              )}
              {order.cargoInvoice && (
                <Button asChild variant="outline" size="sm">
                  <Link href={cargoInvoicePdfUrl(order.publicToken)} target="_blank" rel="noopener noreferrer">
                    Download cargo invoice PDF
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent actions (MVP manual)</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentOrderActions order={order} cargoUsers={cargoUsers} />
              <p className="text-xs text-muted-foreground pt-4">
                Fulfillment: {FULFILLMENT_LABEL[order.fulfillment]}
              </p>
            </CardContent>
          </Card>
          </div>

          {customerTimeline && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Customer sees (preview)</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline steps={customerTimeline} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4 lg:max-w-xl">
          <AgentOrderInvoiceTab order={order} shopName={tenant.shopName} />
          {order.cargoInvoice ? (
            <CargoInvoiceCard
              snapshot={order.cargoInvoice}
              lines={orderItemsToInvoiceLines(order.items)}
              orderCode={order.code}
              publicToken={order.publicToken}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Cargo invoice appears after warehouse check.</p>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          {order.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[240px] md:max-w-md">
                      {item.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Customer price: {fmtThbLine(item.price, item.qty)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Actual pay:{" "}
                      {item.actualPrice !== undefined ? (
                        <span className="text-foreground font-medium">
                          {fmtThbLine(item.actualPrice, item.qty)}
                        </span>
                      ) : (
                        <span>— set after purchase</span>
                      )}
                    </p>
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
        <Link href="/agent/orders">← Back to orders</Link>
      </Button>
    </>
  );
}
