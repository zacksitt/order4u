"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ItemStatus } from "@/lib/types";

import { generatePortalAccessToken } from "@/lib/order-code";
import { canHandOrderToCargo } from "@/lib/order-rules";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { mapOrder, orderDetailInclude } from "@/server/mappers/order";
import { createOrderForTenant, orderLineSchema } from "@/server/services/create-order";

const lineSchema = orderLineSchema;

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().default(""),
  thbShipping: z.number().min(0),
  serviceFeePercent: z.number().min(0).max(100),
  lines: z.array(lineSchema).min(1),
});

export type ActionResult = { ok: true; orderId?: string } | { ok: false; error: string };

export async function createOrder(raw: z.infer<typeof createOrderSchema>): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid order data." };

  const { customerName, customerPhone, thbShipping, serviceFeePercent, lines } = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      tenantId: session.tenantId,
      name: customerName,
      phone: customerPhone.trim() || "—",
      portalAccessToken: generatePortalAccessToken(),
    },
  });

  const { orderId } = await createOrderForTenant({
    tenantId: session.tenantId,
    assignedAgentId: session.userId,
    customerId: customer.id,
    thbShipping,
    serviceFeePercent,
    lines,
  });

  revalidatePath("/agent/orders");
  return { ok: true, orderId };
}

export async function markProductPaid(orderId: string): Promise<ActionResult> {
  const session = await requireAgent();
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.productPaymentStatus === "paid") return { ok: true };

  await prisma.order.update({
    where: { id: orderId },
    data: { productPaymentStatus: "paid", productPaidAt: new Date() },
  });

  revalidatePath(`/agent/orders/${orderId}`);
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
  const session = await requireAgent();
  const statusParsed = itemStatusSchema.safeParse(input.status);
  if (!statusParsed.success) return { ok: false, error: "Invalid status." };

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.items.some((i) => i.id === input.itemId)) {
    return { ok: false, error: "Item not found." };
  }

  await prisma.orderItem.update({
    where: { id: input.itemId },
    data: {
      status: statusParsed.data,
      ...(input.actualPrice !== undefined ? { actualPrice: input.actualPrice } : {}),
    },
  });

  revalidatePath(`/agent/orders/${input.orderId}`);
  return { ok: true };
}

export async function handOrderToCargo(input: {
  orderId: string;
  cargoUserId: string;
}): Promise<ActionResult> {
  const session = await requireAgent();
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, tenantId: session.tenantId, assignedAgentId: session.userId },
    include: orderDetailInclude,
  });
  if (!order) return { ok: false, error: "Order not found." };

  const mapped = mapOrder(order);
  if (!canHandOrderToCargo(mapped)) {
    return { ok: false, error: "All items must be at agent before handoff." };
  }

  const cargoMember = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: session.tenantId,
      userId: input.cargoUserId,
      role: "cargo",
    },
  });
  if (!cargoMember) return { ok: false, error: "Selected user is not cargo staff for this shop." };

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      assignedCargoUserId: input.cargoUserId,
      handedToCargoByUserId: session.userId,
      handedToCargoAt: new Date(),
      fulfillmentStatus: "handed_to_cargo",
    },
  });

  revalidatePath(`/agent/orders/${input.orderId}`);
  revalidatePath("/agent/orders");
  revalidatePath("/cargo/queue");
  return { ok: true };
}
