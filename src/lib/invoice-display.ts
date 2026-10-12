import type { InvoiceSnapshot, OrderItem } from "./types";

export type InvoiceLineDisplay = {
  title: string;
  qty: number;
  price: number;
};

export function orderItemsToInvoiceLines(items: OrderItem[]): InvoiceLineDisplay[] {
  return items.map((i) => ({
    title: i.title,
    qty: i.qty,
    price: i.price,
  }));
}

export function linesSubtotalThb(lines: InvoiceLineDisplay[]): number {
  return lines.reduce((s, l) => s + l.price * l.qty, 0);
}

/** Warn in dev if snapshot subtotal drifts from live lines. */
export function subtotalMatchesSnapshot(lines: InvoiceLineDisplay[], snapshot: InvoiceSnapshot): boolean {
  return Math.abs(linesSubtotalThb(lines) - snapshot.thbSubtotal) < 0.02;
}

export function productInvoicePdfUrl(publicToken: string): string {
  return `/api/invoices/product/${encodeURIComponent(publicToken)}/pdf`;
}

export function cargoInvoicePdfUrl(publicToken: string): string {
  return `/api/invoices/cargo/${encodeURIComponent(publicToken)}/pdf`;
}
