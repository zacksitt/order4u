import { mapOrder, orderDetailInclude } from "@/server/mappers/order";
import { prisma } from "@/server/db";

export async function getCustomerByPortalToken(portalToken: string) {
  return prisma.customer.findUnique({
    where: { portalAccessToken: portalToken },
    include: { tenant: true },
  });
}

export async function listOrdersForCustomerPortal(customerId: string, tenantId: string) {
  const rows = await prisma.order.findMany({
    where: { customerId, tenantId },
    orderBy: { createdAt: "desc" },
    include: orderDetailInclude,
  });
  return rows.map(mapOrder);
}
