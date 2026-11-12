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
