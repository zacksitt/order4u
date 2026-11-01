import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type AgentDashboardStats = {
  openOrders: number;
  awaitingProductPay: number;
  atCargo: number;
  deliveredThisMonth: number;
};

export type DashboardAction = {
  key: string;
  count: number;
  title: string;
  detail: string;
  cta: string;
  countClassName: string;
};

export type DashboardStage = {
  label: string;
  count: number;
  barClassName: string;
};

export type AgentDashboard = {
  stats: AgentDashboardStats;
  actions: DashboardAction[];
  pipeline: DashboardStage[];
};

const AT_CARGO_KPI = [
  "handed_to_cargo",
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
  "cargo_invoiced",
] as const;

const AT_CARGO_PIPELINE = [
  "handed_to_cargo",
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
] as const;

function startOfMonth(): Date {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getAgentDashboardStats(): Promise<AgentDashboard> {
  const session = await requireAgent();
  const base = { tenantId: session.tenantId, assignedAgentId: session.userId };
  const monthStart = startOfMonth();

  const [
    openOrders,
    awaitingProductPay,
    atCargo,
    deliveredThisMonth,
    itemsToPurchase,
    readyForCargo,
    checkException,
    cargoInvoiceReady,
    agentBuying,
    atCargoPipeline,
    shipping,
  ] = await Promise.all([
    prisma.order.count({ where: { ...base, fulfillmentStatus: { not: "delivered" } } }),
    prisma.order.count({ where: { ...base, productPaymentStatus: "awaiting" } }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: { in: [...AT_CARGO_KPI] } } }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: "delivered", updatedAt: { gte: monthStart } },
    }),
    prisma.order.count({
      where: {
        ...base,
        productPaymentStatus: "paid",
        items: { some: { status: "pending_purchase" } },
      },
    }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "ready_for_cargo" } }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "cargo_check_exception" } }),
    prisma.order.count({
      where: {
        ...base,
        fulfillmentStatus: "cargo_invoiced",
        cargoPaymentStatus: "awaiting",
      },
    }),
    prisma.order.count({
      where: { ...base, productPaymentStatus: "paid", fulfillmentStatus: "collecting" },
    }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: { in: [...AT_CARGO_PIPELINE] } } }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "in_transit" } }),
  ]);

  const actionRows: DashboardAction[] = [
    {
      key: "confirm-payments",
      count: awaitingProductPay,
      title: "Confirm product payments",
      detail: "Mark paid after transfer to unlock tracking",
      cta: "Review",
      countClassName: "bg-amber-100 text-amber-900",
    },
    {
      key: "items-to-purchase",
      count: itemsToPurchase,
      title: "Items to purchase",
      detail: "Paid orders with lines pending purchase",
      cta: "Buy",
      countClassName: "bg-cyan-50 text-teal-700",
    },
    {
      key: "ready-for-cargo",
      count: readyForCargo,
      title: "Ready to hand to cargo",
      detail: "All items arrived at agent",
      cta: "Hand off",
      countClassName: "bg-cyan-50 text-teal-700",
    },
    {
      key: "check-exception",
      count: checkException,
      title: "Cargo check exception",
      detail: "Cargo flagged an item — follow up with customer",
      cta: "Open",
      countClassName: "bg-red-100 text-red-800",
    },
    {
      key: "cargo-invoice",
      count: cargoInvoiceReady,
      title: "Cargo invoice ready",
      detail: "Share cargo invoice with customer",
      cta: "Share",
      countClassName: "bg-slate-200 text-slate-800",
    },
  ];

  const stages: DashboardStage[] = [
    { label: "Awaiting payment", count: awaitingProductPay, barClassName: "bg-amber-600" },
    { label: "Agent buying", count: agentBuying, barClassName: "bg-teal-600" },
    { label: "Ready for cargo", count: readyForCargo, barClassName: "bg-teal-600" },
    { label: "At cargo", count: atCargoPipeline, barClassName: "bg-blue-600" },
    { label: "Cargo payment due", count: cargoInvoiceReady, barClassName: "bg-amber-600" },
    { label: "Shipping to Myanmar", count: shipping, barClassName: "bg-blue-600" },
    { label: "Delivered (month)", count: deliveredThisMonth, barClassName: "bg-emerald-600" },
  ];

  return {
    stats: { openOrders, awaitingProductPay, atCargo, deliveredThisMonth },
    actions: actionRows.filter((row) => row.count > 0),
    pipeline: stages,
  };
}
