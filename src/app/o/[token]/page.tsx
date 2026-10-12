import { notFound } from "next/navigation";

import { PublicOrderView } from "@/components/order4u/public-order-view";
import { getPublicOrderByToken } from "@/server/queries/orders";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicOrderPage({ params }: PageProps) {
  const { token } = await params;
  const order = await getPublicOrderByToken(token);
  if (!order) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-6 md:max-w-lg md:py-10">
      <PublicOrderView order={order} shopName={order.shopName} />
    </main>
  );
}
