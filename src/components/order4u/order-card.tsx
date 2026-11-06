import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { PaymentBadges } from "@/components/order4u/payment-badges";
import { StatusPill } from "@/components/order4u/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/lib/types";

type OrderCardProps = {
  order: Order;
  href: string;
  /** Customer cards hide staff-only details such as phone and warehouse progress. */
  audience?: "staff" | "customer";
};

function fmtMmk(n: number) {
  return `${n.toLocaleString("en-US")} MMK`;
}

export function OrderCard({ order, href, audience = "staff" }: OrderCardProps) {
  const forCustomer = audience === "customer";
  const arrived = order.items.filter(
    (i) => i.status === "arrived_at_agent",
  ).length;
  const mmk = order.productInvoice?.mmkTotal;

  return (
    <Link
      href={href}
      className="block active:scale-[0.99] transition-transform"
    >
      <Card className="overflow-hidden shadow-sm hover:border-primary/40 hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.code}</p>
                </div>
                <StatusPill
                  productPaymentStatus={order.productPaymentStatus}
                  cargoPaymentStatus={order.cargoPaymentStatus}
                  fulfillment={order.fulfillment}
                  compact
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {forCustomer
                  ? `${order.items.length} item${order.items.length !== 1 ? "s" : ""}`
                  : `${order.customerName} · ${order.customerPhone}`}
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 px-4 pb-3">
            {forCustomer ? (
              <span />
            ) : (
              <PaymentBadges
                productPaymentStatus={order.productPaymentStatus}
                cargoPaymentStatus={order.cargoPaymentStatus}
              />
            )}
            {mmk !== undefined && (
              <p className="text-lg font-bold text-foreground tabular-nums">
                {fmtMmk(mmk)}
              </p>
            )}
          </div>

          {!forCustomer && <Separator className="border-dashed" />}
          {!forCustomer && (
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Items</span>
                <p className="mt-0.5">
                  {order.items.length} line{order.items.length !== 1 ? "s" : ""}{" "}
                  · {arrived}/{order.items.length} arrived
                </p>
              </div>
              <div className="text-right">
                <span className="font-medium text-foreground">Cargo</span>
                <p className="mt-0.5">
                  {order.fulfillment === "delivered"
                    ? "Delivered"
                    : order.fulfillment === "handed_to_cargo" ||
                        order.fulfillment.startsWith("cargo_")
                      ? "At cargo"
                      : "Not handed over"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
