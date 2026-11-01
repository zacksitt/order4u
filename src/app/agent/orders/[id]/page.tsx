import { notFound } from "next/navigation";

import { AgentOrderDetail } from "@/components/order4u/agent-order-detail";
import { absolutePublicUrl } from "@/lib/app-url";
import { getAgentOrderById } from "@/server/queries/orders";
import { listCargoStaff } from "@/server/queries/users";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [order, cargoUsers] = await Promise.all([getAgentOrderById(id), listCargoStaff()]);
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <AgentOrderDetail
        order={order}
        cargoUsers={cargoUsers}
        trackUrl={absolutePublicUrl(`/o/${order.publicToken}`)}
      />
    </div>
  );
}
