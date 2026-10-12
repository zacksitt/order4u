import type { PublicOrder } from "@/lib/types";
import type { Order } from "@/lib/types";

export function toPublicOrder(order: Order, shopName: string): PublicOrder {
  const { customerPhone: _phone, ...rest } = order;
  return { ...rest, shopName };
}
