import { orderItemsToInvoiceLines } from "@/lib/invoice-display";
import type { CargoInvoicePdfData } from "@/lib/pdf/cargo-invoice-document";
import type { ProductInvoicePdfData } from "@/lib/pdf/product-invoice-document";
import { mapOrder, orderDetailInclude } from "@/server/mappers/order";
import { prisma } from "@/server/db";

export async function getProductInvoicePdfDataByToken(
  token: string,
): Promise<ProductInvoicePdfData | null> {
  const row = await prisma.order.findFirst({
    where: { publicAccessToken: token },
    include: {
      ...orderDetailInclude,
      tenant: { select: { name: true } },
    },
  });
  if (!row?.productInvoice) return null;

  const order = mapOrder(row);
  if (!order.productInvoice) return null;

  return {
    shopName: row.tenant.name,
    orderCode: order.code,
    customerName: order.customerName,
    lines: orderItemsToInvoiceLines(order.items),
    snapshot: order.productInvoice,
  };
}

export async function getCargoInvoicePdfDataByToken(
  token: string,
): Promise<CargoInvoicePdfData | null> {
  const row = await prisma.order.findFirst({
    where: { publicAccessToken: token },
    include: {
      ...orderDetailInclude,
      tenant: { select: { name: true } },
    },
  });
  if (!row?.cargoInvoice) return null;

  const order = mapOrder(row);
  if (!order.cargoInvoice) return null;

  return {
    shopName: row.tenant.name,
    orderCode: order.code,
    lines: orderItemsToInvoiceLines(order.items),
    weightKg: order.cargoInvoice.weightKg,
    mmkTotalDue: order.cargoInvoice.mmkTotal,
  };
}
