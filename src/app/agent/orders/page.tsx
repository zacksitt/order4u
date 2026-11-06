import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_FILTERS, findOrderFilter } from "@/lib/order-filters";
import { cn } from "@/lib/utils";
import { listAgentOrders } from "@/server/queries/orders";

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function AgentOrdersPage({ searchParams }: PageProps) {
  const { view } = await searchParams;
  const orders = await listAgentOrders();
  const current = orders.filter((o) => o.fulfillment !== "delivered");
  const history = orders.filter((o) => o.fulfillment === "delivered");
  const active = findOrderFilter(view);
  const filtered = current.filter(active.match);
  const counts = ORDER_FILTERS.map((filter) => ({ filter, count: current.filter(filter.match).length }));

  return (
    <>
      <PageHeader
        title="Orders"
        description="Open an order to confirm payment, update items, and give it to cargo."
        action={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/agent/orders/new">New order</Link>
          </Button>
        }
      />

      <Tabs defaultValue={view === "history" ? "history" : "current"}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">Current ({current.length})</TabsTrigger>
          <TabsTrigger value="history">Delivered ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <nav aria-label="Filter orders" className="flex flex-wrap gap-1">
            {counts
              .filter(({ filter, count }) => filter.key === "all" || filter.key === active.key || count > 0)
              .map(({ filter, count }) => (
                <Link
                  key={filter.key}
                  href={filter.key === "all" ? "/agent/orders" : `/agent/orders?view=${filter.key}`}
                  aria-current={filter.key === active.key ? "page" : undefined}
                  className={cn(
                    "rounded-full border border-border px-3 py-1 text-xs font-medium",
                    filter.key === active.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label} ({count})
                </Link>
              ))}
          </nav>
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {filtered.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {current.length === 0
                  ? "No orders yet. Tap New order to create one."
                  : `No orders in “${active.label}”.`}
              </p>
            ) : (
              filtered.map((order) => (
                <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No delivered orders yet.</p>
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
