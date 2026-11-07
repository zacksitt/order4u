import { zUuid } from "@/lib/input-rules";
import type { FulfillmentStatus } from "@/lib/types";
import { requireAgent, requireCargo, requireCustomer } from "@/server/auth/session";
import { mapOrder, orderDetailInclude } from "@/server/mappers/order";
import { toPublicOrder } from "@/server/mappers/public-order";
import { prisma } from "@/server/db";
import type { Order, PublicOrder } from "@/lib/types";

const CARGO_QUEUE_STATUSES: FulfillmentStatus[] = [
  "handed_to_cargo",
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
  "cargo_invoiced",
  "in_transit",
  "delivered",
];

export async function listAgentOrders(opts?: { customerId?: string; code?: string }): Promise<Order[]> {
  const session = await requireAgent();
  const customerId = zUuid.safeParse(opts?.customerId ?? "").success ? opts!.customerId : undefined;
  const code = opts?.code?.trim();
  const narrowed = Boolean(customerId || code);
  const rows = await prisma.order.findMany({
    where: {
      tenantId: session.tenantId,
      assignedAgentId: session.userId,
      ...(customerId ? { customerId } : {}),
      ...(code ? { code: { contains: code, mode: "insensitive" } } : {}),
    },
    include: orderDetailInclude,
    orderBy: { updatedAt: "desc" },
    ...(narrowed ? {} : { take: 200 }),
  });
  return rows.map(mapOrder);
}

export async function getAgentOrderById(id: string): Promise<Order | undefined> {
  const session = await requireAgent();
  const row = await prisma.order.findFirst({
    where: { id, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: orderDetailInclude,
  });
  if (!row) return undefined;
  return mapOrder(row);
}

export async function getCargoOrderById(id: string): Promise<Order | undefined> {
  const session = await requireCargo();
  const row = await prisma.order.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      assignedCargoUserId: session.userId,
    },
    include: orderDetailInclude,
  });
  if (!row) return undefined;
  return mapOrder(row);
}

export async function listCargoQueueOrders(): Promise<Order[]> {
  const session = await requireCargo();
  const rows = await prisma.order.findMany({
    where: {
      tenantId: session.tenantId,
      assignedCargoUserId: session.userId,
      fulfillmentStatus: { in: CARGO_QUEUE_STATUSES },
    },
    include: orderDetailInclude,
    orderBy: { handedToCargoAt: "desc" },
    take: 200,
  });
  return rows.map(mapOrder);
}

export async function listCustomerOrders(): Promise<Order[]> {
  const session = await requireCustomer();
  const rows = await prisma.order.findMany({
    where: { tenantId: session.tenantId, createdByUserId: session.userId },
    include: orderDetailInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapOrder);
}

export async function getCustomerOrderById(id: string): Promise<{ order: Order; shopName: string } | undefined> {
  const session = await requireCustomer();
  const row = await prisma.order.findFirst({
    where: { id, tenantId: session.tenantId, createdByUserId: session.userId },
    include: { ...orderDetailInclude, tenant: { select: { name: true } } },
  });
  if (!row) return undefined;
  return { order: mapOrder(row), shopName: row.tenant.name };
}

export async function getPublicOrderByToken(token: string): Promise<PublicOrder | undefined> {
  const row = await prisma.order.findFirst({
    where: { publicAccessToken: token },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" }, include: { itemCategory: true } },
      productInvoice: true,
      cargoInvoice: { include: { lines: true } },
      tenant: { select: { name: true } },
    },
  });
  if (!row) return undefined;
  return toPublicOrder(mapOrder(row), row.tenant.name);
}
