import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type AgentDashboardStats = {
  openOrders: number;
  awaitingProductPay: number;
  atCargo: number;
  delivered: number;
};

const AT_CARGO_FULFILLMENTS = [
  "handed_to_cargo",
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
  "cargo_invoiced",
  "in_transit",
] as const;

export async function getAgentDashboardStats(): Promise<AgentDashboardStats> {
  const session = await requireAgent();
  const base = { tenantId: session.tenantId, assignedAgentId: session.userId };

  const [openOrders, awaitingProductPay, atCargo, delivered] = await Promise.all([
    prisma.order.count({
      where: { ...base, fulfillmentStatus: { not: "delivered" } },
    }),
    prisma.order.count({
      where: { ...base, productPaymentStatus: "awaiting" },
    }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: { in: [...AT_CARGO_FULFILLMENTS] } },
    }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: "delivered" },
    }),
  ]);

  return { openOrders, awaitingProductPay, atCargo, delivered };
}
