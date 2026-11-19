import Link from "next/link";

import { CargoRecentOrders } from "@/components/order4u/cargo-recent-orders";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCargoDashboardStats } from "@/server/queries/dashboard";
import { listCargoQueueOrders } from "@/server/queries/orders";

export default async function CargoDashboardPage() {
  const [dashboard, orders] = await Promise.all([getCargoDashboardStats(), listCargoQueueOrders()]);
  const openOrders = orders.filter(
    (order) => order.fulfillment !== "delivered" && order.fulfillment !== "cancelled",
  );
  const maxStage = Math.max(...dashboard.pipeline.map((stage) => stage.count), 1);

  return (
    <>
      <PageHeader
        className="sm:items-end"
        title="Dashboard"
        description="Orders handed to you for this shop."
        action={
          <Button asChild className="rounded-[10px] px-[18px] font-semibold" variant="outline">
            <Link href="/cargo/orders">View orders</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open orders"
            value={dashboard.stats.openOrders}
            hint="Not yet delivered"
            dotClassName="bg-[#0D9488]"
          />
          <StatCard
            label="To receive"
            value={dashboard.stats.toReceive}
            hint="Waiting at the warehouse"
            dotClassName="bg-[#D97706]"
          />
          <StatCard
            label="Awaiting cargo pay"
            value={dashboard.stats.awaitingCargoPay}
            hint="Invoice sent, not paid"
            dotClassName="bg-[#2563EB]"
          />
          <StatCard
            label="Delivered this month"
            value={dashboard.stats.deliveredThisMonth}
            hint="Completed orders"
            dotClassName="bg-[#059669]"
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[14px]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Needs your action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {dashboard.actions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting on you.</p>
              ) : (
                dashboard.actions.map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="flex min-h-12 items-center gap-3 rounded-lg bg-muted/60 px-3 py-2"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${action.countClassName}`}
                    >
                      {action.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{action.title}</span>
                      <span className="block text-xs text-muted-foreground">{action.detail}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-teal-700">{action.cta} →</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[14px]">
            <CardHeader className="flex flex-row items-baseline justify-between space-y-0 p-5 pb-3.5">
              <CardTitle className="text-base">Cargo pipeline</CardTitle>
              <span className="text-xs text-muted-foreground">Warehouse → Myanmar</span>
            </CardHeader>
            <CardContent className="space-y-3.5 px-5 pb-5">
              {dashboard.pipeline.map((stage) => {
                const width = stage.count === 0 ? 0 : Math.max(6, Math.round((stage.count / maxStage) * 100));
                return (
                  <div key={stage.label} className="grid grid-cols-[9.5rem_minmax(0,1fr)_1.75rem] items-center gap-3">
                    <span className="text-sm text-slate-700">{stage.label}</span>
                    <span className="block h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={`block h-2.5 rounded-full ${stage.barClassName}`}
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span className="text-right text-sm font-semibold tabular-nums">{stage.count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-[14px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-4">
            <CardTitle className="text-base">Recent active orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cargo/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <CargoRecentOrders orders={openOrders} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  dotClassName,
}: {
  label: string;
  value: number;
  hint: string;
  dotClassName: string;
}) {
  return (
    <Card className="rounded-[14px]">
      <CardContent className="flex flex-col gap-2 p-[18px]">
        <p className="flex items-center justify-between text-[13px] text-muted-foreground">
          {label}
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
        </p>
        <p className="text-[30px] font-bold leading-none tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
