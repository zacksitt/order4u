import type { TenantSettings } from "@/lib/agent-settings";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

export async function getTenantSettingsForAgent(): Promise<TenantSettings & { paymentInstructions: string }> {
  const session = await requireAgent();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
  });
  return {
    shopName: tenant.name,
    thbMmkRate: Number(tenant.defaultThbMmkRate),
    defaultServiceFeePercent: Number(tenant.defaultServiceFeePercent),
    paymentInstructions: tenant.paymentInstructions ?? "",
  };
}
