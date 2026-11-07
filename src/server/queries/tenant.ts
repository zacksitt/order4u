import type { TenantSettings } from "@/lib/agent-settings";
import { requireAgent, requireCustomer } from "@/server/auth/session";
import { customerPiiRead } from "@/server/crypto/customer-pii";
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

export async function getTenantSettingsForCustomer(): Promise<
  TenantSettings & { profile: { name: string; phone: string } }
> {
  const session = await requireCustomer();
  const [tenant, customer] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } }),
    prisma.customer.findUnique({ where: { userId: session.userId } }),
  ]);
  const phonePlain = customer ? customerPiiRead(customer).phone : "";
  const phone = phonePlain && phonePlain !== "—" ? phonePlain : "";
  return {
    shopName: tenant.name,
    thbMmkRate: Number(tenant.defaultThbMmkRate),
    defaultServiceFeePercent: Number(tenant.defaultServiceFeePercent),
    profile: { name: customer?.name ?? session.name, phone },
  };
}
