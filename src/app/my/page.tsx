import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCustomerByPortalToken, listOrdersForCustomerPortal } from "@/server/queries/customer-portal";
import { orderSummaryLabel } from "@/lib/status-labels";

type PageProps = { searchParams: Promise<{ c?: string }> };

export default async function MyOrdersPage({ searchParams }: PageProps) {
  const { c } = await searchParams;
  if (!c?.trim()) notFound();

  const customer = await getCustomerByPortalToken(c.trim());
  if (!customer) notFound();

  const orders = await listOrdersForCustomerPortal(customer.id, customer.tenantId);

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
        {customer.tenant.name}
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold">My orders</h1>
      <p className="text-center text-sm text-muted-foreground mt-1">Private link — do not share.</p>

      <div className="mt-6 space-y-3">
        {orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No orders yet. Place one from Messenger.</p>
        ) : (
          orders.map((order) => {
            const summary = orderSummaryLabel(
              order.productPaymentStatus,
              order.fulfillment,
              order.cargoPaymentStatus,
            );
            return (
              <Card key={order.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{order.code}</p>
                    <Badge variant="secondary" className="mt-1">
                      {summary}
                    </Badge>
                  </div>
                  <Link
                    href={`/o/${order.publicToken}`}
                    className="text-sm font-medium text-primary shrink-0"
                  >
                    View →
                  </Link>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}
