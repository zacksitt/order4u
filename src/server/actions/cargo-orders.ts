"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { appendAction } from "@/server/services/actions-log";
import { notifyUser } from "@/server/services/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAssignedOrder(orderId: string, session: { userId: string; tenantId: string }) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      assignedCargoUserId: session.userId,
    },
    include: { items: true, cargoInvoice: true, productInvoice: true, tenant: { select: { defaultThbMmkRate: true } } },
  });
}

function revalidateOrder(orderId: string, publicToken: string) {
  revalidatePath(`/cargo/orders/${orderId}`);
  revalidatePath("/cargo/queue");
  revalidatePath(`/o/${publicToken}`);
}

export async function markCargoReceived(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.fulfillmentStatus !== "handed_to_cargo") {
    return { ok: false, error: "Order must be handed to cargo first." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus: "cargo_received" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: orderId,
      userId: session.userId,
      action: "cargo_received",
    });
  });

  revalidateOrder(orderId, order.publicAccessToken);
  return { ok: true };
}

export async function submitCargoCheck(input: {
  orderId: string;
  items: { itemId: string; checkOk: boolean; note?: string }[];
}): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(input.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };

  for (const row of input.items) {
    if (!order.items.some((i) => i.id === row.itemId)) {
      return { ok: false, error: "Invalid item in check list." };
    }
  }

  const hasException = input.items.some((i) => !i.checkOk);

  await prisma.$transaction(async (tx) => {
    for (const row of input.items) {
      await tx.orderItem.update({
        where: { id: row.itemId },
        data: {
          cargoCheckOk: row.checkOk,
          cargoCheckNote: row.note ?? null,
        },
      });
    }
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        fulfillmentStatus: hasException ? "cargo_check_exception" : "cargo_check_ok",
      },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: input.orderId,
      userId: session.userId,
      action: "cargo_check",
      detail: input.items.map((row) => `${row.itemId}:${row.checkOk ? "ok" : "exception"}`).join(" "),
    });
    if (hasException) {
      await notifyUser(tx, {
        tenantId: session.tenantId,
        userId: order.assignedAgentId,
        type: "check_exception",
        orderId: input.orderId,
        orderCode: order.code,
        href: `/agent/orders/${input.orderId}`,
      });
    }
  });

  if (hasException) revalidatePath("/agent", "layout");

  revalidateOrder(input.orderId, order.publicAccessToken);
  return { ok: true };
}

const issueInvoiceSchema = z.object({
  orderId: z.string(),
  chargeableWeightKg: z.number().positive(),
  thbTotalDue: z.number().positive(),
});

export async function issueCargoInvoice(raw: z.infer<typeof issueInvoiceSchema>): Promise<ActionResult> {
  const session = await requireCargo();
  const parsed = issueInvoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid invoice data." };

  const order = await getAssignedOrder(parsed.data.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoInvoice) return { ok: false, error: "Cargo invoice already issued." };

  const rate = order.productInvoice
    ? Number(order.productInvoice.rateThbMmk)
    : Number(order.tenant.defaultThbMmkRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "No THB to MMK rate on this order." };
  }
  const mmkTotalDue = Math.round(parsed.data.thbTotalDue * rate);
  if (mmkTotalDue <= 0) return { ok: false, error: "Cargo fee is too small to convert." };

  await prisma.$transaction(async (tx) => {
    await tx.cargoInvoice.create({
      data: {
        orderId: parsed.data.orderId,
        chargeableWeightKg: parsed.data.chargeableWeightKg,
        thbTotalDue: parsed.data.thbTotalDue,
        mmkTotalDue,
      },
    });
    await tx.order.update({
      where: { id: parsed.data.orderId },
      data: {
        fulfillmentStatus: "cargo_invoiced",
        cargoPaymentStatus: "awaiting",
      },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: parsed.data.orderId,
      userId: session.userId,
      action: "cargo_invoice_issued",
      detail: `weight ${parsed.data.chargeableWeightKg} thb ${parsed.data.thbTotalDue}`,
    });
    await notifyUser(tx, {
      tenantId: session.tenantId,
      userId: order.assignedAgentId,
      type: "cargo_invoice_ready",
      orderId: parsed.data.orderId,
      orderCode: order.code,
      href: `/agent/orders/${parsed.data.orderId}`,
    });
  });

  revalidateOrder(parsed.data.orderId, order.publicAccessToken);
  revalidatePath(`/agent/orders/${parsed.data.orderId}`);
  revalidatePath("/agent", "layout");
  return { ok: true };
}

export async function markCargoPaid(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoPaymentStatus !== "awaiting") {
    return { ok: false, error: "Cargo invoice is not awaiting payment." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { cargoPaymentStatus: "paid", cargoPaidAt: new Date() },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: orderId,
      userId: session.userId,
      action: "cargo_paid",
    });
  });

  revalidateOrder(orderId, order.publicAccessToken);
  revalidatePath(`/agent/orders/${orderId}`);
  return { ok: true };
}

export async function markInTransit(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoPaymentStatus !== "paid") {
    return { ok: false, error: "Mark cargo paid before shipping." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus: "in_transit" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: orderId,
      userId: session.userId,
      action: "in_transit",
    });
  });

  revalidateOrder(orderId, order.publicAccessToken);
  return { ok: true };
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus: "delivered" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: orderId,
      userId: session.userId,
      action: "delivered",
    });
  });

  revalidateOrder(orderId, order.publicAccessToken);
  revalidatePath("/agent/orders");
  revalidatePath(`/agent/orders/${orderId}`);
  return { ok: true };
}
