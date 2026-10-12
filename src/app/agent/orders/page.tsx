import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isProductPaid } from "@/lib/payment-status";
import { listAgentOrders } from "@/server/queries/orders";

export default async function AgentOrdersPage() {
  const orders = await listAgentOrders();
  const current = orders.filter((o) => o.fulfillment !== "delivered");
  const history = orders.filter((o) => o.fulfillment === "delivered");
  const awaitingPay = current.filter((o) => !isProductPaid(o.productPaymentStatus));
  const atCargo = current.filter((o) =>
    ["handed_to_cargo", "cargo_received", "cargo_checking", "cargo_invoiced", "in_transit"].includes(
      o.fulfillment,
    ),
  );

  return (
    <>
      <PageHeader
        title="My orders"
        description=""
        action={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/agent/orders/new">New order</Link>
          </Button>
        }
      />

      <Tabs defaultValue="current">
        <TabsList className="mb-4">
          <TabsTrigger value="current">Current ({current.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Tabs defaultValue="all">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full border border-border px-3 py-1 text-xs"
              >
                All ({current.length})
              </TabsTrigger>
              <TabsTrigger
                value="pay"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full border border-border px-3 py-1 text-xs"
              >
                Awaiting pay ({awaitingPay.length})
              </TabsTrigger>
              <TabsTrigger
                value="cargo"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full border border-border px-3 py-1 text-xs"
              >
                At cargo ({atCargo.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {current.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center col-span-full">
                  No orders yet. Seed the database or use mock data.
                </p>
              ) : (
                current.map((order) => (
                  <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
                ))
              )}
            </TabsContent>
            <TabsContent value="pay" className="mt-3 space-y-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-1">
              {awaitingPay.map((order) => (
                <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
              ))}
            </TabsContent>
            <TabsContent value="cargo" className="mt-3 space-y-3">
              {atCargo.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No orders at cargo yet.</p>
              ) : (
                atCargo.map((order) => (
                  <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No completed orders yet.</p>
          ) : (
            history.map((order) => (
              <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
