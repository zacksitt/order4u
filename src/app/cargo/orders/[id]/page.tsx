import { notFound } from "next/navigation";

import { CargoOrderDetail } from "@/components/order4u/cargo-order-detail";
import { getCargoOrderById } from "@/server/queries/orders";

type PageProps = { params: Promise<{ id: string }> };

export default async function CargoOrderPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getCargoOrderById(id);
  if (!order) notFound();

  return <CargoOrderDetail order={order} />;
}
