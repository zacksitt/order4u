import type { InvoiceSnapshot } from "./types";

export type ProductInvoiceInput = {
  thbSubtotal: number;
  thbShipping: number;
  rate: number;
  /** Locked percent for this invoice (from settings or edited before issue). */
  serviceFeePercent: number;
};

export function calcServiceFeeThb(thbBase: number, serviceFeePercent: number): number {
  return Math.round((thbBase * serviceFeePercent) / 100 * 100) / 100;
}

/** Goods + TH shipping + agent fee (THB), before MMK conversion. */
export function productInvoiceThbAmountDue(snapshot: {
  thbSubtotal: number;
  thbShipping: number;
  serviceFeeThb: number;
}): number {
  return snapshot.thbSubtotal + snapshot.thbShipping + snapshot.serviceFeeThb;
}

export function buildProductInvoice(input: ProductInvoiceInput): InvoiceSnapshot {
  const thbBase = input.thbSubtotal + input.thbShipping;
  const serviceFeeThb = calcServiceFeeThb(thbBase, input.serviceFeePercent);
  const mmkFromGoods = Math.round(thbBase * input.rate);
  const serviceFeeMmk = Math.round(serviceFeeThb * input.rate);
  const mmkTotal = mmkFromGoods + serviceFeeMmk;

  return {
    thbSubtotal: input.thbSubtotal,
    thbShipping: input.thbShipping,
    rate: input.rate,
    serviceFeePercent: input.serviceFeePercent,
    serviceFeeThb,
    serviceFeeMmk,
    mmkTotal,
  };
}
