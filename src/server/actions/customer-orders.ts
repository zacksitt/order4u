"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { customerCreateOrderSchema, firstIssueMessage } from "@/lib/input-rules";
import { generatePortalAccessToken } from "@/lib/order-code";
import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createOrderForTenant, resolveDefaultAgentId } from "@/server/services/create-order";

export type ActionResult = { ok: true; orderId: string } | { ok: false; error: string };

export async function createCustomerOrder(
  raw: z.infer<typeof customerCreateOrderSchema>,
): Promise<ActionResult> {
  const session = await requireCustomer();
  const parsed = customerCreateOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error, "Invalid order data.") };
  }

  const assignedAgentId = await resolveDefaultAgentId(session.tenantId);
  if (!assignedAgentId) return { ok: false, error: "Shop has no agent configured." };

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const { customerName, customerPhone, lines } = parsed.data;
  const phone = customerPhone || "—";

  const existing = await prisma.customer.findUnique({ where: { userId: session.userId } });
  if (existing && existing.tenantId !== session.tenantId) {
    return { ok: false, error: "This account is already linked to another shop." };
  }

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { name: customerName, phone },
      })
    : await prisma.customer.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          name: customerName,
          phone,
          portalAccessToken: generatePortalAccessToken(),
        },
      });

  try {
    const created = await createOrderForTenant({
      tenantId: session.tenantId,
      assignedAgentId,
      customerId: customer.id,
      createdByUserId: session.userId,
      thbShipping: 0,
      serviceFeePercent: Number(tenant.defaultServiceFeePercent),
      lines,
    });

    revalidatePath("/customer/orders");
    revalidatePath("/agent/orders");
    return { ok: true, orderId: created.orderId };
  } catch (error) {
    console.error("createCustomerOrder failed", error);
    return { ok: false, error: "Could not create the order. Check both items and try again." };
  }
}
