import Link from "next/link";

import { PageHeader } from "@/components/order4u/page-header";
import { StatusPill } from "@/components/order4u/status-pill";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FULFILLMENT_LABEL } from "@/lib/status-labels";
import { requireCargo } from "@/server/auth/session";
import { listCargoQueueOrders } from "@/server/queries/orders";

export default async function CargoQueuePage() {
  const session = await requireCargo();
  const queue = await listCargoQueueOrders();

  return (
    <>
      <PageHeader
        title="Incoming & active"
        description={`Signed in as ${session.name} — only shipments assigned to you.`}
      />

      <div className="space-y-3">
        {queue.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            No shipments assigned to you. Sign in as cargo1@demo.shop after seed to see ORD-9B4C2R.
          </p>
        ) : (
          queue.map((order) => (
            <Link key={order.id} href={`/cargo/orders/${order.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{order.code}</p>
                    <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                    <Badge variant="muted" className="mt-2">
                      {FULFILLMENT_LABEL[order.fulfillment]}
                    </Badge>
                  </div>
                  <StatusPill
                    productPaymentStatus={order.productPaymentStatus}
                    cargoPaymentStatus={order.cargoPaymentStatus}
                    fulfillment={order.fulfillment}
                    compact
                  />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
