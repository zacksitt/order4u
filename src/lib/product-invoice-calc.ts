import type { InvoiceSnapshot } from "./types";

export type ProductInvoiceInput = {
  thbSubtotal: number;
  thbShipping: number;
  rate: number;
  /** THB off the goods subtotal. Cannot exceed the goods subtotal. */
  discountThb?: number;
  /** Locked percent for this invoice (from settings or edited before issue). */
  serviceFeePercent: number;
};

export function calcServiceFeeThb(thbBase: number, serviceFeePercent: number): number {
  return Math.round((thbBase * serviceFeePercent) / 100 * 100) / 100;
}

/** Goods − discount + TH shipping + supplier fee (THB), before MMK conversion. */
export function productInvoiceThbAmountDue(snapshot: {
  thbSubtotal: number;
  thbShipping: number;
  serviceFeeThb: number;
  discountThb?: number;
}): number {
  return snapshot.thbSubtotal - (snapshot.discountThb ?? 0) + snapshot.thbShipping + snapshot.serviceFeeThb;
}

/** Amount still due after cancelled lines. The stored invoice is not rewritten. */
export function remainingProductAmountDue(
  snapshot: InvoiceSnapshot,
  lines: { price: number; qty: number; shippingFeeThb?: number; cancelled?: boolean }[],
): { thb: number; mmk: number; serviceFeeThb: number; serviceFeeMmk: number } {
  if (!lines.some((line) => line.cancelled)) {
    return {
      thb: productInvoiceThbAmountDue(snapshot),
      mmk: snapshot.mmkTotal,
      serviceFeeThb: snapshot.serviceFeeThb,
      serviceFeeMmk: snapshot.serviceFeeMmk,
    };
  }
  const active = lines.filter((line) => !line.cancelled);
  if (active.length === 0) return { thb: 0, mmk: 0, serviceFeeThb: 0, serviceFeeMmk: 0 };

  const goods = active.reduce((sum, line) => sum + line.price * line.qty, 0);
  const shipping = active.reduce((sum, line) => sum + (line.shippingFeeThb ?? 0), 0);
  const discount =
    snapshot.thbSubtotal > 0
      ? Math.round(((snapshot.discountThb * goods) / snapshot.thbSubtotal) * 100) / 100
      : 0;
  const next = buildProductInvoice({
    thbSubtotal: goods,
    thbShipping: shipping,
    rate: snapshot.rate,
    discountThb: Math.min(discount, goods),
    serviceFeePercent: snapshot.serviceFeePercent,
  });
  return {
    thb: productInvoiceThbAmountDue(next),
    mmk: next.mmkTotal,
    serviceFeeThb: next.serviceFeeThb,
    serviceFeeMmk: next.serviceFeeMmk,
  };
}

export function buildProductInvoice(input: ProductInvoiceInput): InvoiceSnapshot {
  const discountThb = input.discountThb ?? 0;
  const thbBase = input.thbSubtotal - discountThb + input.thbShipping;
  const serviceFeeThb = calcServiceFeeThb(thbBase, input.serviceFeePercent);
  const mmkFromBase = Math.round(thbBase * input.rate);
  const serviceFeeMmk = Math.round(serviceFeeThb * input.rate);
  const mmkTotal = mmkFromBase + serviceFeeMmk;

  return {
    thbSubtotal: input.thbSubtotal,
    thbShipping: input.thbShipping,
    discountThb,
    rate: input.rate,
    serviceFeePercent: input.serviceFeePercent,
    serviceFeeThb,
    serviceFeeMmk,
    mmkTotal,
  };
}
