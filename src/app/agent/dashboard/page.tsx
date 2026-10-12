import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgentDashboardStats } from "@/server/queries/dashboard";
import { listAgentOrders } from "@/server/queries/orders";

export default async function AgentDashboardPage() {
  const [stats, orders] = await Promise.all([getAgentDashboardStats(), listAgentOrders()]);
  const recent = orders.filter((o) => o.fulfillment !== "delivered").slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your shop — Thailand sourcing to cargo handoff."
        action={
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/agent/orders/new">New order</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open orders" value={stats.openOrders} href="/agent/orders" />
        <StatCard label="Awaiting product pay" value={stats.awaitingProductPay} href="/agent/orders" />
        <StatCard label="At cargo" value={stats.atCargo} href="/agent/orders" />
        <StatCard label="Delivered" value={stats.delivered} href="/agent/orders" />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent active orders</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/agent/orders">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No open orders.</p>
          ) : (
            recent.map((order) => (
              <OrderCard key={order.id} order={order} href={`/agent/orders/${order.id}`} />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Margin and order exports — expand in Reports as you add filters and CSV export.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/agent/reports">Open reports</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
