import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicOrderView } from "@/components/order4u/public-order-view";
import { toPublicOrder } from "@/server/mappers/public-order";
import { getCustomerOrderById } from "@/server/queries/orders";

type PageProps = { params: Promise<{ id: string }> };

export default async function CustomerOrderPage({ params }: PageProps) {
  const { id } = await params;
  const found = await getCustomerOrderById(id);
  if (!found) notFound();

  return (
    <div className="space-y-4">
      <Link href="/customer/orders" className="text-sm font-semibold text-primary">
        Back to my orders
      </Link>
      <PublicOrderView
        order={toPublicOrder(found.order, found.shopName)}
        shopName={found.shopName}
        variant="account"
      />
    </div>
  );
}
