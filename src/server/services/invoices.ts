import { buildProductInvoice } from "@/lib/product-invoice-calc";
import type { InvoiceSnapshot } from "@/lib/types";

export function buildProductInvoiceSnapshot(input: {
  thbSubtotal: number;
  thbShipping: number;
  rate: number;
  serviceFeePercent: number;
}): InvoiceSnapshot {
  return buildProductInvoice(input);
}

export function productInvoiceToDb(snapshot: InvoiceSnapshot) {
  return {
    thbSubtotal: snapshot.thbSubtotal,
    thbShipping: snapshot.thbShipping,
    serviceFeePercent: snapshot.serviceFeePercent,
    serviceFeeThb: snapshot.serviceFeeThb,
    mmkServiceFee: snapshot.serviceFeeMmk,
    rateThbMmk: snapshot.rate,
    mmkTotalDue: snapshot.mmkTotal,
  };
}
