"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { cargoCategoryLines, roundThb } from "@/lib/cargo-fee";
import { cargoInvoiceIssueSchema, firstIssueMessage, zUuid } from "@/lib/input-rules";
import type { ItemStatus } from "@/lib/types";
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
  revalidatePath("/cargo/orders");
  revalidatePath(`/o/${publicToken}`);
}

function parseOrderId(orderId: string): string | null {
  const parsed = zUuid.safeParse(orderId);
  return parsed.success ? parsed.data : null;
}

export async function markCargoReceived(orderId: string): Promise<ActionResult> {
  const id = parseOrderId(orderId);
  if (!id) return { ok: false, error: "Invalid order." };
  const session = await requireCargo();
  const order = await getAssignedOrder(id, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.fulfillmentStatus !== "handed_to_cargo") {
    return { ok: false, error: "Order must be handed to cargo first." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: id },
      data: { fulfillmentStatus: "cargo_received" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: id,
      userId: session.userId,
      action: "cargo_received",
    });
  });

  revalidateOrder(id, order.publicAccessToken);
  return { ok: true };
}

export async function submitCargoCheck(input: {
  orderId: string;
  items: { itemId: string; checkOk: boolean; note?: string }[];
}): Promise<ActionResult> {
  const parsed = z
    .object({
      orderId: zUuid,
      items: z.array(z.object({ itemId: zUuid, checkOk: z.boolean(), note: z.string().max(500).optional() })),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid check.") };
  const session = await requireCargo();
  const order = await getAssignedOrder(parsed.data.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };

  for (const row of parsed.data.items) {
    if (!order.items.some((i) => i.id === row.itemId)) {
      return { ok: false, error: "Invalid item in check list." };
    }
  }

  const hasException = parsed.data.items.some((i) => !i.checkOk);

  await prisma.$transaction(async (tx) => {
    for (const row of parsed.data.items) {
      await tx.orderItem.update({
        where: { id: row.itemId },
        data: {
          cargoCheckOk: row.checkOk,
          cargoCheckNote: row.note ?? null,
        },
      });
    }
    await tx.order.update({
      where: { id: parsed.data.orderId },
      data: {
        fulfillmentStatus: hasException ? "cargo_check_exception" : "cargo_check_ok",
      },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: parsed.data.orderId,
      userId: session.userId,
      action: "cargo_check",
      detail: parsed.data.items.map((row) => `${row.itemId}:${row.checkOk ? "ok" : "exception"}`).join(" "),
    });
    if (hasException) {
      await notifyUser(tx, {
        tenantId: session.tenantId,
        userId: order.assignedAgentId,
        type: "check_exception",
        orderId: parsed.data.orderId,
        orderCode: order.code,
        href: `/agent/orders/${parsed.data.orderId}`,
      });
    }
  });

  if (hasException) revalidatePath("/agent", "layout");

  revalidateOrder(parsed.data.orderId, order.publicAccessToken);
  return { ok: true };
}

const issueInvoiceSchema = cargoInvoiceIssueSchema;

export async function assignItemCategories(input: {
  orderId: string;
  items: { itemId: string; categoryId: string | null }[];
}): Promise<ActionResult> {
  const parsed = z
    .object({
      orderId: zUuid,
      items: z.array(z.object({ itemId: zUuid, categoryId: zUuid.nullable() })),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid item.") };
  const session = await requireCargo();
  const order = await getAssignedOrder(parsed.data.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoInvoice) return { ok: false, error: "Cargo invoice is already issued." };

  const categoryIds = [...new Set(parsed.data.items.map((row) => row.categoryId).filter((id): id is string => !!id))];
  if (categoryIds.length > 0) {
    const found = await prisma.itemCategory.findMany({
      where: { tenantId: session.tenantId, id: { in: categoryIds } },
      select: { id: true },
    });
    if (found.length !== categoryIds.length) return { ok: false, error: "Unknown category." };
  }

  for (const row of parsed.data.items) {
    if (!order.items.some((item) => item.id === row.itemId)) {
      return { ok: false, error: "Invalid item." };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of parsed.data.items) {
      await tx.orderItem.update({
        where: { id: row.itemId },
        data: { itemCategoryId: row.categoryId },
      });
    }
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: parsed.data.orderId,
      userId: session.userId,
      action: "item_categories",
      detail: parsed.data.items.map((row) => `${row.itemId}:${row.categoryId ?? "none"}`).join(" "),
    });
  });

  revalidateOrder(parsed.data.orderId, order.publicAccessToken);
  return { ok: true };
}

export async function issueCargoInvoice(raw: z.infer<typeof issueInvoiceSchema>): Promise<ActionResult> {
  const session = await requireCargo();
  const parsed = issueInvoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid invoice data.") };

  const order = await getAssignedOrder(parsed.data.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoInvoice) return { ok: false, error: "Cargo invoice already issued." };

  const categories = await prisma.itemCategory.findMany({ where: { tenantId: session.tenantId } });
  const weightByCategoryId = Object.fromEntries(
    parsed.data.categoryLines.map((row) => [row.categoryId, row.weightKg]),
  );
  const priceByCategoryId = Object.fromEntries(
    parsed.data.categoryLines
      .filter((row) => row.unitPriceThb !== undefined)
      .map((row) => [row.categoryId, row.unitPriceThb as number]),
  );
  const { lines, subtotal, totalWeightKg, missing } = cargoCategoryLines(
    order.items.map((item) => ({ id: item.id, qty: item.qty, status: item.status as ItemStatus })),
    categories.map((row) => ({ id: row.id, name: row.name, cargoPriceThb: Number(row.cargoPriceThb) })),
    Object.fromEntries(order.items.map((item) => [item.id, item.itemCategoryId ?? ""])),
    weightByCategoryId,
    priceByCategoryId,
  );
  if (missing > 0) return { ok: false, error: "Set a category on every item first." };
  if (lines.length === 0) return { ok: false, error: "No items to invoice." };
  if (lines.some((line) => line.weightKg <= 0)) {
    return { ok: false, error: "Enter the weight for every category." };
  }

  const discountThb = roundThb(parsed.data.discountThb);
  if (discountThb >= subtotal) return { ok: false, error: "Discount must be less than the subtotal." };
  const thbTotalDue = roundThb(subtotal - discountThb);

  const rate = order.productInvoice
    ? Number(order.productInvoice.rateThbMmk)
    : Number(order.tenant.defaultThbMmkRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "No THB to MMK rate on this order." };
  }
  const mmkTotalDue = Math.round(thbTotalDue * rate);
  if (mmkTotalDue <= 0) return { ok: false, error: "Cargo fee is too small to convert." };

  await prisma.$transaction(async (tx) => {
    await tx.cargoInvoice.create({
      data: {
        orderId: parsed.data.orderId,
        chargeableWeightKg: totalWeightKg,
        subtotalThb: subtotal,
        discountThb,
        thbTotalDue,
        mmkTotalDue,
        lines: {
          create: lines.map((line, i) => ({
            sortOrder: i,
            categoryName: line.categoryName,
            qty: line.qty,
            weightKg: line.weightKg,
            unitPriceThb: line.unitPriceThb,
            totalThb: line.totalThb,
          })),
        },
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
      detail: `weight ${totalWeightKg} subtotal ${subtotal} discount ${discountThb} thb ${thbTotalDue}`,
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
  const id = parseOrderId(orderId);
  if (!id) return { ok: false, error: "Invalid order." };
  const session = await requireCargo();
  const order = await getAssignedOrder(id, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoPaymentStatus !== "awaiting") {
    return { ok: false, error: "Cargo invoice is not awaiting payment." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: id },
      data: { cargoPaymentStatus: "paid", cargoPaidAt: new Date() },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: id,
      userId: session.userId,
      action: "cargo_paid",
    });
  });

  revalidateOrder(id, order.publicAccessToken);
  revalidatePath(`/agent/orders/${id}`);
  return { ok: true };
}

export async function markInTransit(orderId: string): Promise<ActionResult> {
  const id = parseOrderId(orderId);
  if (!id) return { ok: false, error: "Invalid order." };
  const session = await requireCargo();
  const order = await getAssignedOrder(id, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoPaymentStatus !== "paid") {
    return { ok: false, error: "Tap Customer paid before shipping." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: id },
      data: { fulfillmentStatus: "in_transit" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: id,
      userId: session.userId,
      action: "in_transit",
    });
  });

  revalidateOrder(id, order.publicAccessToken);
  return { ok: true };
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  const id = parseOrderId(orderId);
  if (!id) return { ok: false, error: "Invalid order." };
  const session = await requireCargo();
  const order = await getAssignedOrder(id, session);
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: id },
      data: { fulfillmentStatus: "delivered" },
    });
    await appendAction(tx, {
      tenantId: session.tenantId,
      entityType: "order",
      entityId: id,
      userId: session.userId,
      action: "delivered",
    });
  });

  revalidateOrder(id, order.publicAccessToken);
  revalidatePath("/agent/orders");
  revalidatePath(`/agent/orders/${id}`);
  return { ok: true };
}
