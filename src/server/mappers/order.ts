import type {
  CargoInvoice,
  CargoInvoiceLine,
  Customer,
  ItemCategory,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  ProductInvoice,
} from "@prisma/client";

import type {
  CargoPaymentStatus,
  FulfillmentStatus,
  InvoiceSnapshot,
  ItemStatus,
  Order,
  OrderItem,
  ProductPaymentStatus,
} from "@/lib/types";

type OrderItemRow = DbOrderItem & { itemCategory?: ItemCategory | null };

type OrderRow = DbOrder & {
  customer: Customer;
  items: OrderItemRow[];
  productInvoice: ProductInvoice | null;
  cargoInvoice: (CargoInvoice & { lines?: CargoInvoiceLine[] }) | null;
};

function num(v: { toString(): string } | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

function mapProductInvoice(inv: ProductInvoice): InvoiceSnapshot {
  return {
    thbSubtotal: num(inv.thbSubtotal),
    thbShipping: num(inv.thbShipping),
    rate: num(inv.rateThbMmk),
    serviceFeePercent: num(inv.serviceFeePercent),
    serviceFeeThb: num(inv.serviceFeeThb),
    serviceFeeMmk: inv.mmkServiceFee,
    mmkTotal: inv.mmkTotalDue,
  };
}

function mapCargoInvoice(
  inv: CargoInvoice & { lines?: CargoInvoiceLine[] },
): NonNullable<Order["cargoInvoice"]> {
  return {
    weightKg: num(inv.chargeableWeightKg),
    mmkTotal: inv.mmkTotalDue,
    thbTotal: inv.thbTotalDue != null ? num(inv.thbTotalDue) : undefined,
    subtotalThb: inv.subtotalThb != null ? num(inv.subtotalThb) : undefined,
    discountThb: num(inv.discountThb),
    lines: [...(inv.lines ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((line) => ({
        categoryName: line.categoryName,
        qty: line.qty,
        weightKg: num(line.weightKg),
        unitPriceThb: num(line.unitPriceThb),
        totalThb: num(line.totalThb),
      })),
  };
}

function mapItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    title: row.title,
    url: row.sourceUrl,
    qty: row.qty,
    status: row.status as ItemStatus,
    price: num(row.price),
    shippingFeeThb: num(row.shippingFeeThb),
    actualPrice: row.actualPrice != null ? num(row.actualPrice) : undefined,
    catalogItemId: row.catalogItemId ?? undefined,
    checkOk: row.cargoCheckOk ?? undefined,
    checkNote: row.cargoCheckNote ?? undefined,
    categoryId: row.itemCategoryId ?? undefined,
    categoryName: row.itemCategory?.name,
    categoryCargoPriceThb:
      row.itemCategory != null ? num(row.itemCategory.cargoPriceThb) : undefined,
  };
}

export function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    code: row.code,
    customerPhone: row.customer.phone,
    customerName: row.customer.name,
    productPaymentStatus: row.productPaymentStatus as ProductPaymentStatus,
    cargoPaymentStatus: row.cargoPaymentStatus as CargoPaymentStatus,
    fulfillment: row.fulfillmentStatus as FulfillmentStatus,
    items: row.items.map(mapItem),
    productInvoice: row.productInvoice ? mapProductInvoice(row.productInvoice) : undefined,
    cargoInvoice: row.cargoInvoice ? mapCargoInvoice(row.cargoInvoice) : undefined,
    publicToken: row.publicAccessToken,
    assignedCargoUserId: row.assignedCargoUserId ?? undefined,
  };
}

export const orderDetailInclude = {
  customer: true,
  items: { orderBy: { sortOrder: "asc" as const }, include: { itemCategory: true } },
  productInvoice: true,
  cargoInvoice: { include: { lines: true } },
};
