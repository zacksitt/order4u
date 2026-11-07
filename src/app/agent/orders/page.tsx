import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { OrdersCustomerFilter } from "@/components/order4u/orders-customer-filter";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agentOrdersHref } from "@/lib/agent-orders-href";
import { zUuid } from "@/lib/input-rules";
import { ORDER_FILTERS, findOrderFilter } from "@/lib/order-filters";
import { cn } from "@/lib/utils";
import { getAgentCustomerById } from "@/server/queries/customers";
import { listAgentOrders } from "@/server/queries/orders";

type PageProps = { searchParams: Promise<{ view?: string; customer?: string }> };

export default async function AgentOrdersPage({ searchParams }: PageProps) {
  const { view, customer: customerParam } = await searchParams;
  const customerId = zUuid.safeParse(customerParam ?? "").success ? customerParam : undefined;
  const [orders, selectedCustomer] = await Promise.all([
    listAgentOrders({ customerId }),
    customerId ? getAgentCustomerById(customerId) : Promise.resolve(null),
  ]);
  const current = orders.filter((o) => o.fulfillment !== "delivered");
  const history = orders.filter((o) => o.fulfillment === "delivered");
  const isHistory = view === "history";
  const active = findOrderFilter(isHistory ? "all" : view);
  const filtered = current.filter(active.match);
  const counts = ORDER_FILTERS.map((filter) => ({ filter, count: current.filter(filter.match).length }));
  const selected = selectedCustomer
    ? { id: selectedCustomer.id, name: selectedCustomer.name }
    : customerId
      ? { id: customerId, name: "Unknown customer" }
      : null;
  const tabView = isHistory ? "history" : active.key;

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

      <OrdersCustomerFilter selected={selected} view={tabView} />

      <Tabs value={isHistory ? "history" : "current"}>
        <TabsList className="mb-4">
          <TabsTrigger value="current" asChild>
            <Link href={agentOrdersHref({ view: active.key, customer: customerId })}>
              Current ({current.length})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link href={agentOrdersHref({ view: "history", customer: customerId })}>
              Delivered ({history.length})
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <nav aria-label="Filter orders" className="flex flex-wrap gap-1">
            {counts
              .filter(({ filter, count }) => filter.key === "all" || filter.key === active.key || count > 0)
              .map(({ filter, count }) => (
                <Link
                  key={filter.key}
                  href={agentOrdersHref({ view: filter.key, customer: customerId })}
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
                  ? selected
                    ? "No current orders for this customer."
                    : "No orders yet. Tap New order to create one."
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
            <p className="text-sm text-muted-foreground py-12 text-center">
              {selected ? "No delivered orders for this customer." : "No delivered orders yet."}
            </p>
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
