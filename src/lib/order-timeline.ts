import { isCargoPaid } from "./payment-status";
import type { FulfillmentStatus, Order } from "./types";

export type TimelineStep = {
  id: string;
  title: string;
  description: string;
  /** 0 = upcoming, 1 = current, 2 = done */
  state: 0 | 1 | 2;
  timeLabel?: string;
};

const FULFILLMENT_RANK: Record<FulfillmentStatus, number> = {
  collecting: 1,
  ready_for_cargo: 2,
  handed_to_cargo: 3,
  cargo_received: 4,
  cargo_checking: 4,
  cargo_check_ok: 5,
  cargo_check_exception: 5,
  cargo_invoiced: 6,
  in_transit: 7,
  delivered: 8,
};

function stepState(threshold: number, rank: number): 0 | 1 | 2 {
  if (rank > threshold) return 2;
  if (rank === threshold) return 1;
  return 0;
}

type TimelineOrder = Pick<Order, "productPaymentStatus" | "cargoPaymentStatus" | "fulfillment" | "items">;

/** Customer-facing journey (after product payment). */
export function buildCustomerTimeline(order: TimelineOrder): TimelineStep[] {
  let rank = FULFILLMENT_RANK[order.fulfillment];
  const allAtAgent = order.items.every(
    (i) => i.status === "arrived_at_agent" || i.status === "cancelled",
  );
  if (allAtAgent && rank < 2) rank = 2;
  if (isCargoPaid(order.cargoPaymentStatus) && rank >= 6) rank = Math.max(rank, 7);

  const steps: Omit<TimelineStep, "state">[] = [
    {
      id: "product_paid",
      title: "Product payment confirmed",
      description: "Your agent can start buying items in Thailand.",
      timeLabel: "Nov 24 · 7:42 PM",
    },
    {
      id: "buying",
      title: "Agent Buying",
      description: "Each item is updated until everything reaches the agent warehouse.",
      timeLabel: allAtAgent ? "Completed" : "In progress",
    },
    {
      id: "at_agent",
      title: "All items at agent",
      description: "Items are ready to hand to cargo in one shipment.",
    },
    {
      id: "handed_cargo",
      title: "Handed to cargo",
      description: "Your order is with the Myanmar cargo partner.",
    },
    {
      id: "cargo_check",
      title: "Cargo received & checked",
      description: "Warehouse verifies contents before cargo invoice.",
    },
    {
      id: "cargo_invoice",
      title: "Cargo invoice",
      description: isCargoPaid(order.cargoPaymentStatus)
        ? "Cargo fee paid — preparing export shipment."
        : "Pay cargo fee in chat when your agent sends this link.",
    },
    {
      id: "in_transit",
      title: "In transit to Myanmar",
      description: "Shipment is on the way to you.",
    },
    {
      id: "delivered",
      title: "Delivered",
      description: "Order complete. Thank you for shopping with us.",
    },
  ];

  const thresholds = [0, 1, 2, 3, 4, 6, 7, 8];

  return steps.map((step, i) => ({
    ...step,
    state: stepState(thresholds[i] ?? 0, rank),
  }));
}
