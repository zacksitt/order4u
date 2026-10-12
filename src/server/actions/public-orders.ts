"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCustomerByPortalToken } from "@/server/queries/customer-portal";
import { getTenantBySlug } from "@/server/queries/tenant-messenger";
import {
  createOrderForTenant,
  orderLineSchema,
  resolveDefaultAgentId,
} from "@/server/services/create-order";
import { prisma } from "@/server/db";

const submitPublicOrderSchema = z.object({
  shopSlug: z.string().min(1),
  portalToken: z.string().min(8),
  customerName: z.string().min(1),
  customerPhone: z.string().optional().default(""),
  lines: z.array(orderLineSchema).min(1),
});

export type PublicOrderActionResult =
  | { ok: true; publicAccessToken: string; orderCode: string }
  | { ok: false; error: string };

export async function submitPublicOrder(
  raw: z.infer<typeof submitPublicOrderSchema>,
): Promise<PublicOrderActionResult> {
  const parsed = submitPublicOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid order data." };

  const { shopSlug, portalToken, customerName, customerPhone, lines } = parsed.data;

  const tenant = await getTenantBySlug(shopSlug);
  if (!tenant || !tenant.publicOrderFormEnabled) {
    return { ok: false, error: "Shop not found or ordering is disabled." };
  }

  const customer = await getCustomerByPortalToken(portalToken.trim());
  if (!customer || customer.tenantId !== tenant.id) {
    return { ok: false, error: "Invalid or expired order link. Open Place order from Messenger again." };
  }

  const assignedAgentId = await resolveDefaultAgentId(tenant.id);
  if (!assignedAgentId) {
    return { ok: false, error: "Shop has no agent configured." };
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      name: customerName.trim(),
      phone: customerPhone.trim() || customer.phone || "—",
    },
  });

  const serviceFeePercent = Number(tenant.defaultServiceFeePercent);

  let created: { orderId: string; publicAccessToken: string; code: string };
  try {
    created = await createOrderForTenant({
      tenantId: tenant.id,
      assignedAgentId,
      customerId: customer.id,
      thbShipping: 0,
      serviceFeePercent,
      lines,
    });
  } catch {
    return { ok: false, error: "Could not create order. Try again." };
  }

  revalidatePath("/agent/orders");
  revalidatePath(`/agent/orders/${created.orderId}`);
  revalidatePath(`/o/${created.publicAccessToken}`);
  revalidatePath("/my");

  return {
    ok: true,
    publicAccessToken: created.publicAccessToken,
    orderCode: created.code,
  };
}
