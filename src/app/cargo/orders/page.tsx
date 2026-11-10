import Link from "next/link";

import { PageHeader } from "@/components/order4u/page-header";
import { PagedOrderList } from "@/components/order4u/paged-order-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CARGO_ORDER_FILTERS, findCargoOrderFilter } from "@/lib/cargo-order-filters";
import { fmtCargoFee } from "@/lib/format-money";
import { FULFILLMENT_LABEL } from "@/lib/status-labels";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { listCargoQueueOrders } from "@/server/queries/orders";

type PageProps = { searchParams: Promise<{ view?: string }> };

function cargoOrdersHref(view?: string) {
  return view && view !== "all" ? `/cargo/orders?view=${view}` : "/cargo/orders";
}

export default async function CargoOrdersPage({ searchParams }: PageProps) {
  const { view } = await searchParams;
  const orders = await listCargoQueueOrders();
  const current = orders.filter((o) => o.fulfillment !== "delivered");
  const history = orders.filter((o) => o.fulfillment === "delivered");
  const active = findCargoOrderFilter(view);
  const filtered = current.filter(active.match);
  const counts = CARGO_ORDER_FILTERS.map((filter) => ({ filter, count: current.filter(filter.match).length }));

  return (
    <>
      <PageHeader title="Orders" description="Orders handed to you. Open one to see the next step." />

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
                  href={cargoOrdersHref(filter.key)}
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
          <PagedOrderList
            key={active.key}
            className="space-y-3"
            empty={
              <p className="py-8 text-center text-sm text-muted-foreground">
                {current.length === 0
                  ? "No orders assigned to you yet. The agent will hand orders to you."
                  : `No orders in “${active.label}”.`}
              </p>
            }
          >
            {filtered.map((order) => (
              <CargoOrderRow key={order.id} order={order} />
            ))}
          </PagedOrderList>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No delivered orders yet.</p>
          ) : (
            history.map((order) => <CargoOrderRow key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function CargoOrderRow({ order }: { order: Order }) {
  const qty = order.items.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.qty, 0);
  return (
    <Link href={`/cargo/orders/${order.id}`} className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{order.code}</p>
            <p className="text-sm text-muted-foreground">
              {order.customerName} · {qty} item{qty !== 1 ? "s" : ""}
            </p>
            <Badge variant="muted" className="mt-2">
              {FULFILLMENT_LABEL[order.fulfillment]}
              {order.cargoInvoice && order.cargoPaymentStatus === "paid" ? " · paid" : ""}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            {order.cargoInvoice && (
              <p className="text-sm font-semibold tabular-nums">{fmtCargoFee(order.cargoInvoice)}</p>
            )}
            <span className="text-sm font-semibold text-primary">Open →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
