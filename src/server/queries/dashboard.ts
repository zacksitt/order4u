import { requireAgent, requireCargo } from "@/server/auth/session";
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
    prisma.order.count({ where: { ...base, fulfillmentStatus: { notIn: ["delivered", "cancelled"] } } }),
    prisma.order.count({
      where: { ...base, productPaymentStatus: "awaiting", fulfillmentStatus: { not: "cancelled" } },
    }),
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
      title: "Ready to ship to cargo",
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

const CARGO_CHECKING = [
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
] as const;

export type CargoDashboardStats = {
  openOrders: number;
  toReceive: number;
  awaitingCargoPay: number;
  deliveredThisMonth: number;
};

export type CargoDashboard = {
  stats: CargoDashboardStats;
  actions: DashboardAction[];
  pipeline: DashboardStage[];
};

export async function getCargoDashboardStats(): Promise<CargoDashboard> {
  const session = await requireCargo();
  const base = { tenantId: session.tenantId, assignedCargoUserId: session.userId };
  const monthStart = startOfMonth();

  const [
    openOrders,
    toReceive,
    toInvoice,
    awaitingCargoPay,
    toShip,
    inTransit,
    deliveredThisMonth,
    checking,
  ] = await Promise.all([
    prisma.order.count({ where: { ...base, fulfillmentStatus: { notIn: ["delivered", "cancelled"] } } }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "handed_to_cargo" } }),
    prisma.order.count({
      where: {
        ...base,
        fulfillmentStatus: { in: [...CARGO_CHECKING] },
        cargoInvoice: { is: null },
      },
    }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: "cargo_invoiced", cargoPaymentStatus: "awaiting" },
    }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: "cargo_invoiced", cargoPaymentStatus: "paid" },
    }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: "in_transit" } }),
    prisma.order.count({
      where: { ...base, fulfillmentStatus: "delivered", updatedAt: { gte: monthStart } },
    }),
    prisma.order.count({ where: { ...base, fulfillmentStatus: { in: [...CARGO_CHECKING] } } }),
  ]);

  const actionRows: DashboardAction[] = [
    {
      key: "to-receive",
      count: toReceive,
      title: "Orders to receive",
      detail: "Agent handed these over. Confirm they arrived.",
      cta: "Receive",
      href: "/cargo/orders?view=receive",
      countClassName: "bg-amber-100 text-amber-900",
    },
    {
      key: "to-invoice",
      count: toInvoice,
      title: "Ready to invoice",
      detail: "Check items and issue the cargo invoice",
      cta: "Invoice",
      href: "/cargo/orders?view=invoice",
      countClassName: "bg-cyan-50 text-teal-700",
    },
    {
      key: "awaiting-pay",
      count: awaitingCargoPay,
      title: "Awaiting cargo payment",
      detail: "Customer has not paid the cargo invoice yet",
      cta: "Open",
      href: "/cargo/orders?view=payment",
      countClassName: "bg-slate-200 text-slate-800",
    },
    {
      key: "to-ship",
      count: toShip,
      title: "Ready to ship",
      detail: "Cargo fee is paid. Mark in transit when you send.",
      cta: "Ship",
      href: "/cargo/orders?view=ship",
      countClassName: "bg-cyan-50 text-teal-700",
    },
  ];

  const stages: DashboardStage[] = [
    { label: "To receive", count: toReceive, barClassName: "bg-amber-600" },
    { label: "Checking", count: checking, barClassName: "bg-teal-600" },
    { label: "To invoice", count: toInvoice, barClassName: "bg-teal-600" },
    { label: "Cargo payment due", count: awaitingCargoPay, barClassName: "bg-amber-600" },
    { label: "Ready to ship", count: toShip, barClassName: "bg-blue-600" },
    { label: "In transit", count: inTransit, barClassName: "bg-blue-600" },
    { label: "Delivered this month", count: deliveredThisMonth, barClassName: "bg-emerald-600" },
  ];

  return {
    stats: { openOrders, toReceive, awaitingCargoPay, deliveredThisMonth },
    actions: actionRows.filter((row) => row.count > 0),
    pipeline: stages,
  };
}
