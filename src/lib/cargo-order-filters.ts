import type { Order } from "./types";

export const CARGO_ORDER_FILTERS = [
  { key: "all", label: "All", match: () => true },
  { key: "receive", label: "To receive", match: (o: Order) => o.fulfillment === "handed_to_cargo" },
  {
    key: "invoice",
    label: "To invoice",
    match: (o: Order) =>
      (o.fulfillment === "cargo_received" ||
        o.fulfillment === "cargo_checking" ||
        o.fulfillment === "cargo_check_ok" ||
        o.fulfillment === "cargo_check_exception") &&
      !o.cargoInvoice,
  },
  {
    key: "payment",
    label: "Awaiting payment",
    match: (o: Order) => o.fulfillment === "cargo_invoiced" && o.cargoPaymentStatus === "awaiting",
  },
  {
    key: "ship",
    label: "To ship",
    match: (o: Order) => o.fulfillment === "cargo_invoiced" && o.cargoPaymentStatus === "paid",
  },
  { key: "transit", label: "In transit", match: (o: Order) => o.fulfillment === "in_transit" },
] as const;

export function findCargoOrderFilter(key: string | undefined) {
  return CARGO_ORDER_FILTERS.find((filter) => filter.key === key) ?? CARGO_ORDER_FILTERS[0];
}
