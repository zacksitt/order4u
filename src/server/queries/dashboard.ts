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
  href: string;
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

const NOT_ARRIVED = ["pending_purchase", "purchased", "seller_shipped"] as const;

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
    prisma.order.count({
      where: {
        ...base,
        productPaymentStatus: "paid",
        fulfillmentStatus: { in: ["collecting", "ready_for_cargo"] },
        items: { none: { status: { in: [...NOT_ARRIVED] } } },
      },
    }),
    prisma.order.count({
      where: {
        ...base,
        fulfillmentStatus: "cargo_invoiced",
        cargoPaymentStatus: "awaiting",
      },
    }),
    prisma.order.count({
      where: {
        ...base,
        productPaymentStatus: "paid",
        fulfillmentStatus: "collecting",
        items: { some: { status: { in: [...NOT_ARRIVED] } } },
      },
    }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: { in: [...AT_CARGO_PIPELINE] } } }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "in_transit" } }),
  ]);

  const actionRows: DashboardAction[] = [
    {
      key: "confirm-payments",
      count: awaitingProductPay,
      title: "Confirm product payments",
      detail: "Tap Customer paid when their transfer arrives",
      cta: "Confirm",
      href: "/agent/orders?view=pay",
      countClassName: "bg-amber-100 text-amber-900",
    },
    {
      key: "items-to-purchase",
      count: itemsToPurchase,
      title: "Items to purchase",
      detail: "Paid orders with items still to buy",
      cta: "Buy items",
      href: "/agent/orders?view=buy",
      countClassName: "bg-cyan-50 text-teal-700",
    },
    {
      key: "ready-for-cargo",
      count: readyForCargo,
      title: "Ready to give to cargo",
      detail: "All items have arrived",
      cta: "Give to cargo",
      href: "/agent/orders?view=ready",
      countClassName: "bg-cyan-50 text-teal-700",
    },
    {
      key: "cargo-invoice",
      count: cargoInvoiceReady,
      title: "Cargo invoice ready",
      detail: "Send the customer link so they can pay cargo",
      cta: "Send link",
      href: "/agent/orders?view=cargo-due",
      countClassName: "bg-slate-200 text-slate-800",
    },
  ];

  const stages: DashboardStage[] = [
    { label: "Awaiting payment", count: awaitingProductPay, barClassName: "bg-amber-600" },
    { label: "Buying", count: agentBuying, barClassName: "bg-teal-600" },
    { label: "Ready for cargo", count: readyForCargo, barClassName: "bg-teal-600" },
    { label: "At cargo", count: atCargoPipeline, barClassName: "bg-blue-600" },
    { label: "Cargo payment due", count: cargoInvoiceReady, barClassName: "bg-amber-600" },
    { label: "Shipping to Myanmar", count: shipping, barClassName: "bg-blue-600" },
    { label: "Delivered this month", count: deliveredThisMonth, barClassName: "bg-emerald-600" },
  ];

  return {
    stats: { openOrders, awaitingProductPay, atCargo, deliveredThisMonth },
    actions: actionRows.filter((row) => row.count > 0),
    pipeline: stages,
  };
}
