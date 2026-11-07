"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssueMessage, tenantSettingsSchema } from "@/lib/input-rules";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { appendAction } from "@/server/services/actions-log";

const updateSchema = tenantSettingsSchema;

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateTenantSettings(raw: z.infer<typeof updateSchema>): Promise<ActionResult> {
  const session = await requireAgent();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error, "Invalid settings.") };

  const current = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: { defaultThbMmkRate: true, defaultServiceFeePercent: true },
  });
  const beforeRate = Number(current.defaultThbMmkRate);
  const beforeFee = Number(current.defaultServiceFeePercent);
  const rateChanged = beforeRate !== parsed.data.thbMmkRate;
  const feeChanged = beforeFee !== parsed.data.defaultServiceFeePercent;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: session.tenantId },
      data: {
        name: parsed.data.shopName,
        defaultThbMmkRate: parsed.data.thbMmkRate,
        defaultServiceFeePercent: parsed.data.defaultServiceFeePercent,
        paymentInstructions: parsed.data.paymentInstructions,
      },
    });
    const historyCount = await tx.exchangeRateHistory.count({
      where: { tenantId: session.tenantId },
    });
    if (rateChanged || historyCount === 0) {
      await tx.exchangeRateHistory.create({
        data: {
          tenantId: session.tenantId,
          rate: parsed.data.thbMmkRate,
          setByUserId: session.userId,
        },
      });
    }
    if (rateChanged || feeChanged) {
      await appendAction(tx, {
        tenantId: session.tenantId,
        entityType: "tenant",
        entityId: session.tenantId,
        userId: session.userId,
        action: "settings_updated",
        detail: `rate ${beforeRate} to ${parsed.data.thbMmkRate} fee ${beforeFee} to ${parsed.data.defaultServiceFeePercent}`,
      });
    }
  });

  revalidatePath("/agent/settings");
  return { ok: true };
}
