import { canHandOrderToCargo } from "./order-rules";
import { isProductPaid } from "./payment-status";
import type { FulfillmentStatus, Order } from "./types";

const AT_CARGO: FulfillmentStatus[] = [
  "handed_to_cargo",
  "cargo_received",
  "cargo_checking",
  "cargo_check_ok",
  "cargo_check_exception",
  "cargo_invoiced",
  "in_transit",
];

export const ORDER_FILTERS = [
  { key: "all", label: "All", match: () => true },
  { key: "pay", label: "Awaiting payment", match: (o: Order) => !isProductPaid(o.productPaymentStatus) },
  {
    key: "buy",
    label: "To buy",
    match: (o: Order) =>
      isProductPaid(o.productPaymentStatus) && o.items.some((item) => item.status === "pending_purchase"),
  },
  {
    key: "ready",
    label: "Ready for cargo",
    match: (o: Order) => isProductPaid(o.productPaymentStatus) && canHandOrderToCargo(o),
  },
  {
    key: "cargo-due",
    label: "Cargo payment due",
    match: (o: Order) => o.fulfillment === "cargo_invoiced" && o.cargoPaymentStatus === "awaiting",
  },
  { key: "cargo", label: "At cargo", match: (o: Order) => AT_CARGO.includes(o.fulfillment) },
] as const;

export type OrderFilterKey = (typeof ORDER_FILTERS)[number]["key"];

export function findOrderFilter(key: string | undefined) {
  return ORDER_FILTERS.find((filter) => filter.key === key) ?? ORDER_FILTERS[0];
}
