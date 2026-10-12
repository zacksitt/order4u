import { isProductPaid } from "./payment-status";
import type {
  CargoPaymentStatus,
  FulfillmentStatus,
  ItemStatus,
  ProductPaymentStatus,
} from "./types";

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending_purchase: "Pending purchase",
  purchased: "Purchased",
  seller_shipped: "Seller shipped",
  arrived_at_agent: "At agent",
  cancelled: "Cancelled",
};

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  collecting: "Agent Buying",
  ready_for_cargo: "Ready for cargo",
  handed_to_cargo: "Handed to cargo",
  cargo_received: "Cargo received",
  cargo_checking: "Cargo checking",
  cargo_check_ok: "Check OK",
  cargo_check_exception: "Check exception",
  cargo_invoiced: "Cargo invoiced",
  in_transit: "In transit",
  delivered: "Delivered",
};

export function orderSummaryLabel(
  productPaymentStatus: ProductPaymentStatus,
  fulfillment: FulfillmentStatus,
  cargoPaymentStatus?: CargoPaymentStatus,
): string {
  if (!isProductPaid(productPaymentStatus)) return "Awaiting product payment";
  if (fulfillment === "delivered") return "Delivered";
  if (fulfillment === "in_transit") return "Shipping to Myanmar";
  if (cargoPaymentStatus === "awaiting" && fulfillment === "cargo_invoiced") {
    return "Cargo payment due";
  }
  if (
    fulfillment === "cargo_invoiced" ||
    fulfillment === "cargo_check_ok" ||
    fulfillment === "cargo_checking" ||
    fulfillment === "cargo_received"
  ) {
    return "At cargo";
  }
  if (fulfillment === "handed_to_cargo") return "With cargo";
  return "Agent Buying";
}
