import { isProductPaid } from "./payment-status";
import type {
  CargoPaymentStatus,
  FulfillmentStatus,
  ItemStatus,
  ProductPaymentStatus,
} from "./types";

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending_purchase: "To buy",
  purchased: "Bought",
  seller_shipped: "Seller sent",
  arrived_at_agent: "Arrived",
  cancelled: "Cancelled",
};

export const ITEM_STATUS_CLASS: Record<ItemStatus, string> = {
  pending_purchase: "bg-slate-100 text-slate-600",
  purchased: "bg-cyan-100 text-teal-800",
  seller_shipped: "bg-cyan-100 text-teal-800",
  arrived_at_agent: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-slate-100 text-slate-600",
};

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  collecting: "Buying",
  ready_for_cargo: "Ready for cargo",
  handed_to_cargo: "Handed to cargo",
  cargo_received: "Cargo received",
  cargo_checking: "Cargo received",
  cargo_check_ok: "Cargo received",
  cargo_check_exception: "Cargo received",
  cargo_invoiced: "Cargo invoiced",
  in_transit: "Shipping to Myanmar",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderSummaryLabel(
  productPaymentStatus: ProductPaymentStatus,
  fulfillment: FulfillmentStatus,
  cargoPaymentStatus?: CargoPaymentStatus,
): string {
  if (fulfillment === "cancelled") return "Cancelled";
  if (!isProductPaid(productPaymentStatus)) return "Awaiting payment";
  if (fulfillment === "delivered") return "Delivered";
  if (fulfillment === "in_transit") return "Shipping to Myanmar";
  if (cargoPaymentStatus === "awaiting" && fulfillment === "cargo_invoiced") {
    return "Cargo payment due";
  }
  if (
    fulfillment === "handed_to_cargo" ||
    fulfillment === "cargo_invoiced" ||
    fulfillment === "cargo_check_ok" ||
    fulfillment === "cargo_check_exception" ||
    fulfillment === "cargo_checking" ||
    fulfillment === "cargo_received"
  ) {
    return "At cargo";
  }
  if (fulfillment === "ready_for_cargo") return "Ready for cargo";
  return "Buying";
}

export const ORDER_SUMMARY_FILTERS = [
  "Awaiting payment",
  "Buying",
  "Ready for cargo",
  "At cargo",
  "Cargo payment due",
  "Shipping to Myanmar",
  "Delivered",
] as const;
