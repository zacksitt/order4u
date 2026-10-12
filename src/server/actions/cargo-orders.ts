"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getAssignedOrder(orderId: string, session: { userId: string; tenantId: string }) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: session.tenantId,
      assignedCargoUserId: session.userId,
    },
    include: { items: true, cargoInvoice: true },
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

  await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "cargo_received" },
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

  await prisma.$transaction([
    ...input.items.map((row) =>
      prisma.orderItem.update({
        where: { id: row.itemId },
        data: {
          cargoCheckOk: row.checkOk,
          cargoCheckNote: row.note ?? null,
        },
      }),
    ),
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        fulfillmentStatus: hasException ? "cargo_check_exception" : "cargo_check_ok",
      },
    }),
  ]);

  revalidateOrder(input.orderId, order.publicAccessToken);
  return { ok: true };
}

const issueInvoiceSchema = z.object({
  orderId: z.string(),
  chargeableWeightKg: z.number().positive(),
  mmkTotalDue: z.number().int().positive(),
});

export async function issueCargoInvoice(raw: z.infer<typeof issueInvoiceSchema>): Promise<ActionResult> {
  const session = await requireCargo();
  const parsed = issueInvoiceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid invoice data." };

  const order = await getAssignedOrder(parsed.data.orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoInvoice) return { ok: false, error: "Cargo invoice already issued." };

  await prisma.$transaction([
    prisma.cargoInvoice.create({
      data: {
        orderId: parsed.data.orderId,
        chargeableWeightKg: parsed.data.chargeableWeightKg,
        mmkTotalDue: parsed.data.mmkTotalDue,
      },
    }),
    prisma.order.update({
      where: { id: parsed.data.orderId },
      data: {
        fulfillmentStatus: "cargo_invoiced",
        cargoPaymentStatus: "awaiting",
      },
    }),
  ]);

  revalidateOrder(parsed.data.orderId, order.publicAccessToken);
  revalidatePath(`/agent/orders/${parsed.data.orderId}`);
  return { ok: true };
}

export async function markCargoPaid(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.cargoPaymentStatus !== "awaiting") {
    return { ok: false, error: "Cargo invoice is not awaiting payment." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { cargoPaymentStatus: "paid", cargoPaidAt: new Date() },
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

  await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "in_transit" },
  });

  revalidateOrder(orderId, order.publicAccessToken);
  return { ok: true };
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  const session = await requireCargo();
  const order = await getAssignedOrder(orderId, session);
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "delivered" },
  });

  revalidateOrder(orderId, order.publicAccessToken);
  revalidatePath("/agent/orders");
  revalidatePath(`/agent/orders/${orderId}`);
  return { ok: true };
}
