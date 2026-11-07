"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssueMessage, publicCreateOrderSchema } from "@/lib/input-rules";
import { getCustomerByPortalToken } from "@/server/queries/customer-portal";
import { getTenantBySlug } from "@/server/queries/tenant-messenger";
import { createOrderForTenant, resolveDefaultAgentId } from "@/server/services/create-order";
import { customerPiiRead, customerPiiWrite } from "@/server/crypto/customer-pii";
import { prisma } from "@/server/db";

const submitPublicOrderSchema = publicCreateOrderSchema;

export type PublicOrderActionResult =
  | { ok: true; publicAccessToken: string; orderCode: string }
  | { ok: false; error: string };

export async function submitPublicOrder(
  raw: z.infer<typeof submitPublicOrderSchema>,
): Promise<PublicOrderActionResult> {
  const parsed = submitPublicOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid order data.") };

  const { shopSlug, portalToken, customerName, customerPhone, lines } = parsed.data;

  const tenant = await getTenantBySlug(shopSlug);
  if (!tenant || !tenant.publicOrderFormEnabled) {
    return { ok: false, error: "Shop not found or ordering is disabled." };
  }

  const customer = await getCustomerByPortalToken(portalToken);
  if (!customer || customer.tenantId !== tenant.id) {
    return { ok: false, error: "Invalid or expired order link. Open Place order from Messenger again." };
  }

  const assignedAgentId = await resolveDefaultAgentId(tenant.id);
  if (!assignedAgentId) {
    return { ok: false, error: "Shop has no agent configured." };
  }

  const existingPii = customerPiiRead(customer);
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      name: customerName,
      ...customerPiiWrite({
        phone: customerPhone || existingPii.phone || "—",
        email: existingPii.email,
        facebookProfileUrl: existingPii.facebookProfileUrl,
        notes: existingPii.notes,
        messengerPsid: existingPii.messengerPsid,
      }),
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
