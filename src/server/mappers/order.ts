import type {
  CargoInvoice,
  Customer,
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

type OrderRow = DbOrder & {
  customer: Customer;
  items: DbOrderItem[];
  productInvoice: ProductInvoice | null;
  cargoInvoice: CargoInvoice | null;
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

function mapCargoInvoice(inv: CargoInvoice): InvoiceSnapshot & { weightKg: number } {
  return {
    thbSubtotal: 0,
    thbShipping: 0,
    rate: 0,
    serviceFeePercent: 0,
    serviceFeeThb: 0,
    serviceFeeMmk: 0,
    mmkTotal: inv.mmkTotalDue,
    weightKg: num(inv.chargeableWeightKg),
  };
}

function mapItem(row: DbOrderItem): OrderItem {
  return {
    id: row.id,
    title: row.title,
    url: row.sourceUrl,
    qty: row.qty,
    status: row.status as ItemStatus,
    price: num(row.price),
    actualPrice: row.actualPrice != null ? num(row.actualPrice) : undefined,
    catalogItemId: row.catalogItemId ?? undefined,
    checkOk: row.cargoCheckOk ?? undefined,
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
  items: { orderBy: { sortOrder: "asc" as const } },
  productInvoice: true,
  cargoInvoice: true,
};
