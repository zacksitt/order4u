"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

const updateSchema = z.object({
  shopName: z.string().min(1),
  thbMmkRate: z.number().positive(),
  defaultServiceFeePercent: z.number().min(0).max(100),
  paymentInstructions: z.string(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateTenantSettings(raw: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid settings." };

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      name: parsed.data.shopName,
      defaultThbMmkRate: parsed.data.thbMmkRate,
      defaultServiceFeePercent: parsed.data.defaultServiceFeePercent,
      paymentInstructions: parsed.data.paymentInstructions,
    },
  });

  revalidatePath("/agent/settings");
  return { ok: true };
}
