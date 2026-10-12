import { generatePortalAccessToken } from "@/lib/order-code";
import { prisma } from "@/server/db";

export async function upsertMessengerCustomer(input: {
  tenantId: string;
  psid: string;
  displayName?: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: { tenantId: input.tenantId, messengerPsid: input.psid },
  });
  if (existing) {
    const needsToken = !existing.portalAccessToken;
    const needsName =
      input.displayName && input.displayName !== existing.messengerDisplayName;
    if (needsToken || needsName) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(needsToken ? { portalAccessToken: generatePortalAccessToken() } : {}),
          ...(needsName
            ? {
                messengerDisplayName: input.displayName,
                name: existing.name === "Messenger customer" ? input.displayName! : existing.name,
              }
            : {}),
        },
      });
    }
    return existing;
  }

  return prisma.customer.create({
    data: {
      tenantId: input.tenantId,
      messengerPsid: input.psid,
      messengerDisplayName: input.displayName,
      name: input.displayName?.trim() || "Messenger customer",
      phone: "—",
      portalAccessToken: generatePortalAccessToken(),
    },
  });
}
