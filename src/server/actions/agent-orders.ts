"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ItemStatus } from "@/lib/types";

import { agentCreateOrderSchema, firstIssueMessage, zThbPositive, zUuid } from "@/lib/input-rules";
import { canHandOrderToCargo } from "@/lib/order-rules";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { mapOrder, orderDetailInclude } from "@/server/mappers/order";
import { appendAction } from "@/server/services/actions-log";
import { createAgentCustomerRecord } from "@/server/services/create-customer-login";
import { createOrderForTenant } from "@/server/services/create-order";
import { notifyUser } from "@/server/services/notifications";

const createOrderSchema = agentCreateOrderSchema;

export type ActionResult = { ok: true; orderId?: string } | { ok: false; error: string };

export async function createOrder(raw: z.infer<typeof createOrderSchema>): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid order data.") };

  const { customerName, customerPhone, customerId, thbShipping, serviceFeePercent, lines } = parsed.data;

  let resolvedCustomerId = customerId;
  if (resolvedCustomerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: resolvedCustomerId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Customer not found." };
  } else {
    const created = await createAgentCustomerRecord({
      tenantId: session.tenantId,
      name: customerName,
      phone: customerPhone,
    });
    if (!created.ok) return created;
    resolvedCustomerId = created.customerId;
  }

  if (!resolvedCustomerId) return { ok: false, error: "Customer is required." };

  const { orderId } = await createOrderForTenant({
    tenantId: session.tenantId,
    assignedAgentId: session.userId,
    customerId: resolvedCustomerId,
    thbShipping,
    serviceFeePercent,
    lines,
  });

  revalidatePath("/agent/orders");
  revalidatePath("/agent/customers");
  return { ok: true, orderId };
}

export async function markProductPaid(orderId: string): Promise<ActionResult> {
  const id = zUuid.safeParse(orderId);
  if (!id.success) return { ok: false, error: "Invalid order." };
  const session = await requireAgent();
  const order = await prisma.order.findFirst({
    where: { id: id.data, tenantId: session.tenantId, assignedAgentId: session.userId },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.productPaymentStatus === "paid") return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: id.data },
      data: { productPaymentStatus: "paid", productPaidAt: new Date() },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: id.data,
      userId: session.userId,
      action: "product_paid",
    });
  });

  revalidatePath(`/agent/orders/${id.data}`);
  revalidatePath("/agent/orders");
  revalidatePath(`/o/${order.publicAccessToken}`);
  return { ok: true };
}

const itemStatusSchema = z.enum([
  "pending_purchase",
  "purchased",
  "seller_shipped",
  "arrived_at_agent",
  "cancelled",
]);

export async function updateOrderItemStatus(input: {
  orderId: string;
  itemId: string;
  status: ItemStatus;
  actualPrice?: number;
}): Promise<ActionResult> {
  const ids = z.object({ orderId: zUuid, itemId: zUuid }).safeParse(input);
  if (!ids.success) return { ok: false, error: "Invalid item." };
  const session = await requireAgent();
  const statusParsed = itemStatusSchema.safeParse(input.status);
  if (!statusParsed.success) return { ok: false, error: "Invalid status." };
  const priceParsed =
    input.actualPrice === undefined ? undefined : zThbPositive.safeParse(input.actualPrice);
  if (priceParsed && !priceParsed.success) {
    return { ok: false, error: firstIssueMessage(priceParsed.error, "Enter the THB amount you paid.") };
  }

  const order = await prisma.order.findFirst({
    where: { id: ids.data.orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const item = order.items.find((i) => i.id === ids.data.itemId);
  if (!item) return { ok: false, error: "Item not found." };

  const detailParts = [ids.data.itemId, item.status, statusParsed.data];
  if (priceParsed) detailParts.push(String(priceParsed.data));

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: ids.data.itemId },
      data: {
        status: statusParsed.data,
        ...(priceParsed ? { actualPrice: priceParsed.data } : {}),
      },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: ids.data.orderId,
      userId: session.userId,
      action: "item_status_changed",
      detail: detailParts.join(" "),
    });
  });

  revalidatePath(`/agent/orders/${ids.data.orderId}`);
  return { ok: true };
}

export async function updateOrderItemActualPrice(input: {
  orderId: string;
  itemId: string;
  actualPrice: number;
}): Promise<ActionResult> {
  const parsed = z
    .object({ orderId: zUuid, itemId: zUuid, actualPrice: zThbPositive })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Enter a THB amount.") };
  const session = await requireAgent();

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const item = order.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return { ok: false, error: "Item not found." };
  if (item.status === "cancelled") return { ok: false, error: "Cancelled items have no purchase price." };

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: parsed.data.itemId },
      data: { actualPrice: parsed.data.actualPrice },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: parsed.data.orderId,
      userId: session.userId,
      action: "actual_price_updated",
      detail: `${parsed.data.itemId} ${parsed.data.actualPrice}`,
    });
  });

  revalidatePath(`/agent/orders/${parsed.data.orderId}`);
  return { ok: true };
}

export async function handOrderToCargo(input: {
  orderId: string;
  cargoUserId: string;
}): Promise<ActionResult> {
  const parsed = z.object({ orderId: zUuid, cargoUserId: zUuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose cargo staff." };
  const session = await requireAgent();
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: orderDetailInclude,
  });
  if (!order) return { ok: false, error: "Order not found." };

  const mapped = mapOrder(order);
  if (!canHandOrderToCargo(mapped)) {
    return { ok: false, error: "All items must arrive before you hand the order to cargo." };
  }

  const cargoMember = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: session.tenantId,
      userId: parsed.data.cargoUserId,
      role: "cargo",
    },
  });
  if (!cargoMember) return { ok: false, error: "Selected user is not cargo staff for this shop." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: parsed.data.orderId },
      data: {
        assignedCargoUserId: parsed.data.cargoUserId,
        handedToCargoByUserId: session.userId,
        handedToCargoAt: new Date(),
        fulfillmentStatus: "handed_to_cargo",
      },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: parsed.data.orderId,
      userId: session.userId,
      action: "handed_to_cargo",
      detail: parsed.data.cargoUserId,
    });
    await notifyUser(tx, {
      tenantId: session.tenantId,
      userId: parsed.data.cargoUserId,
      type: "handed_to_cargo",
      orderId: parsed.data.orderId,
      orderCode: order.code,
      href: `/cargo/orders/${parsed.data.orderId}`,
    });
  });

  revalidatePath(`/agent/orders/${parsed.data.orderId}`);
  revalidatePath("/agent/orders");
  revalidatePath("/cargo/orders");
  revalidatePath("/cargo", "layout");
  return { ok: true };
}
