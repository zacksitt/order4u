import { z } from "zod";

import { generateOrderCode, generatePublicAccessToken } from "@/lib/order-code";
import { prisma } from "@/server/db";
import { buildProductInvoiceSnapshot, productInvoiceToDb } from "@/server/services/invoices";

export const orderLineSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(8),
  qty: z.number().int().min(1),
  price: z.number().min(0),
  catalogItemId: z.string().optional(),
});

export type OrderLineInput = z.infer<typeof orderLineSchema>;

export async function resolveDefaultAgentId(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultAgentId: true },
  });
  if (tenant?.defaultAgentId) return tenant.defaultAgentId;

  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, role: "agent" },
    select: { userId: true },
  });
  return membership?.userId ?? null;
}

export async function createOrderForTenant(input: {
  tenantId: string;
  assignedAgentId: string;
  customerId: string;
  thbShipping: number;
  serviceFeePercent: number;
  lines: OrderLineInput[];
}): Promise<{ orderId: string; publicAccessToken: string; code: string }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: input.tenantId } });
  const rate = Number(tenant.defaultThbMmkRate);

  const thbSubtotal = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const snapshot = buildProductInvoiceSnapshot({
    thbSubtotal,
    thbShipping: input.thbShipping,
    rate,
    serviceFeePercent: input.serviceFeePercent,
  });

  const lineCatalogIds: (string | null)[] = [];
  for (const line of input.lines) {
    if (line.catalogItemId) {
      lineCatalogIds.push(line.catalogItemId);
      continue;
    }
    const catalogRow = await prisma.catalogItem.create({
      data: {
        tenantId: input.tenantId,
        name: line.title,
        sourceUrl: line.url,
        price: line.price,
      },
    });
    lineCatalogIds.push(catalogRow.id);
  }

  const order = await prisma.order.create({
    data: {
      tenantId: input.tenantId,
      assignedAgentId: input.assignedAgentId,
      customerId: input.customerId,
      code: generateOrderCode(),
      publicAccessToken: generatePublicAccessToken(),
      items: {
        create: input.lines.map((line, i) => ({
          sortOrder: i,
          title: line.title,
          sourceUrl: line.url,
          qty: line.qty,
          price: line.price,
          catalogItemId: lineCatalogIds[i] ?? null,
        })),
      },
      productInvoice: {
        create: productInvoiceToDb(snapshot),
      },
    },
  });

  return {
    orderId: order.id,
    publicAccessToken: order.publicAccessToken,
    code: order.code,
  };
}
