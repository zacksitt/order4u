import type { FulfillmentStatus, Order, OrderItem } from "./types";

export function allItemsArrived(items: OrderItem[]): boolean {
  return items.every((i) => i.status === "arrived_at_agent" || i.status === "cancelled");
}

export function allItemsArrivedForOrder(order: Order): boolean {
  return allItemsArrived(order.items);
}

export function canHandOrderToCargo(order: Order): boolean {
  return (
    allItemsArrivedForOrder(order) &&
    (order.fulfillment === "collecting" || order.fulfillment === "ready_for_cargo")
  );
}

export function isHandedToCargo(fulfillment: FulfillmentStatus): boolean {
  const preHandoff: FulfillmentStatus[] = ["collecting", "ready_for_cargo"];
  return !preHandoff.includes(fulfillment);
}

export function quotedThbSubtotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
