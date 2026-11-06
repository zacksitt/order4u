import Link from "next/link";

import { OrderCard } from "@/components/order4u/order-card";
import { PageHeader } from "@/components/order4u/page-header";
import { Button } from "@/components/ui/button";
import { listCustomerOrders } from "@/server/queries/orders";

export default async function CustomerOrdersPage() {
  const orders = await listCustomerOrders();

  return (
    <>
      <PageHeader
        title="My orders"
        description="Orders you placed. Open one to see its invoice and progress."
        action={
          <Button asChild size="sm">
            <Link href="/customer/orders/new">New order</Link>
          </Button>
        }
      />
      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">You have not placed an order yet. Tap New order to start.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              href={`/customer/orders/${order.id}`}
              audience="customer"
            />
          ))}
        </div>
      )}
    </>
  );
}
