import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { OrdersFilterDialog } from "@/components/order4u/orders-filter-dialog";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agentOrdersHref } from "@/lib/agent-orders-href";
import { MAX_SEARCH, zCatalogQuery, zUuid } from "@/lib/input-rules";
import { ORDER_FILTERS, findOrderFilter } from "@/lib/order-filters";
import { cn } from "@/lib/utils";
import { getAgentCustomerById } from "@/server/queries/customers";
import { listAgentOrders } from "@/server/queries/orders";

type PageProps = { searchParams: Promise<{ view?: string; customer?: string; code?: string }> };

export default async function AgentOrdersPage({ searchParams }: PageProps) {
  const { view, customer: customerParam, code: codeParam } = await searchParams;
  const customerId = zUuid.safeParse(customerParam ?? "").success ? customerParam : undefined;
  const code = zCatalogQuery.safeParse((codeParam ?? "").slice(0, MAX_SEARCH)).data ?? "";
  const [orders, selectedCustomer] = await Promise.all([
    listAgentOrders({ customerId, code: code || undefined }),
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
  const hrefBase = { customer: customerId, code: code || undefined };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Open an order to confirm payment, update items, and give it to cargo."
        action={
          <div className="flex items-center gap-2">
            <OrdersFilterDialog view={tabView} customer={selected} code={code} />
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href="/agent/orders/new">New order</Link>
            </Button>
          </div>
        }
      />

      <Tabs value={isHistory ? "history" : "current"}>
        <TabsList className="mb-4">
          <TabsTrigger value="current" asChild>
            <Link href={agentOrdersHref({ view: active.key, ...hrefBase })}>
              Current ({current.length})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link href={agentOrdersHref({ view: "history", ...hrefBase })}>
              Delivered ({history.length})
            </Link>
          </TabsTrigger>
        </TabsList>

        {(selected || code) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selected && (
              <Link
                href={agentOrdersHref({ view: tabView, code: code || undefined })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
              >
                {selected.name}
                <span aria-hidden>×</span>
                <span className="sr-only">Remove customer filter</span>
              </Link>
            )}
            {code && (
              <Link
                href={agentOrdersHref({ view: tabView, customer: customerId })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
              >
                {code}
                <span aria-hidden>×</span>
                <span className="sr-only">Remove order code filter</span>
              </Link>
            )}
          </div>
        )}

        <TabsContent value="current" className="space-y-4">
          <nav aria-label="Filter orders" className="flex flex-wrap gap-1">
            {counts
              .filter(({ filter, count }) => filter.key === "all" || filter.key === active.key || count > 0)
              .map(({ filter, count }) => (
                <Link
                  key={filter.key}
                  href={agentOrdersHref({ view: filter.key, ...hrefBase })}
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
                  ? selected || code
                    ? "No current orders match this filter."
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
              {selected || code ? "No delivered orders match this filter." : "No delivered orders yet."}
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
