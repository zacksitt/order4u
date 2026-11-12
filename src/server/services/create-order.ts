import { orderLineInputSchema, type OrderLineInput } from "@/lib/input-rules";
import { marketplaceFromLine } from "@/lib/marketplace";
import { generateOrderCode, generatePublicAccessToken } from "@/lib/order-code";
import { prisma } from "@/server/db";
import { buildProductInvoiceSnapshot, productInvoiceToDb } from "@/server/services/invoices";

export const orderLineSchema = orderLineInputSchema;
export type { OrderLineInput };

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
  createdByUserId?: string;
  thbShipping: number;
  serviceFeePercent: number;
  /** Shop default when omitted. */
  rate?: number;
  discountThb?: number;
  lines: OrderLineInput[];
}): Promise<{ orderId: string; publicAccessToken: string; code: string }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: input.tenantId } });
  const rate = input.rate ?? Number(tenant.defaultThbMmkRate);
  const discountThb = input.discountThb ?? 0;

  const thbSubtotal = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const lineShipping = input.lines.reduce((s, l) => s + (l.shippingFeeThb ?? 0), 0);
  const thbShipping = input.lines.some((l) => l.shippingFeeThb !== undefined)
    ? lineShipping
    : input.thbShipping;
  if (discountThb > thbSubtotal) {
    throw new Error("Discount cannot be more than the item total.");
  }
  const snapshot = buildProductInvoiceSnapshot({
    thbSubtotal,
    thbShipping,
    rate,
    serviceFeePercent: input.serviceFeePercent,
    discountThb,
  });

  const lineCatalogIds: (string | null)[] = [];
  for (const line of input.lines) {
    if (line.catalogItemId) {
      lineCatalogIds.push(line.catalogItemId);
      continue;
    }
    const url = line.url.trim();
    if (url) {
      const existing = await prisma.catalogItem.findFirst({
        where: { tenantId: input.tenantId, sourceUrl: url },
        select: { id: true },
      });
      if (existing) {
        lineCatalogIds.push(existing.id);
        continue;
      }
    }
    const catalogRow = await prisma.catalogItem.create({
      data: {
        tenantId: input.tenantId,
        name: line.title,
        sourceUrl: url || null,
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
      createdByUserId: input.createdByUserId,
      code: generateOrderCode(),
      publicAccessToken: generatePublicAccessToken(),
      items: {
        create: input.lines.map((line, i) => ({
          sortOrder: i,
          title: line.title,
          sourceUrl: line.url,
          qty: line.qty,
          price: line.price,
          shippingFeeThb: line.shippingFeeThb ?? 0,
          catalogItemId: lineCatalogIds[i] ?? null,
          customerNote: line.customerNote?.trim() || null,
          ...marketplaceFromLine(line),
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
