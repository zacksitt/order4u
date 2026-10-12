import { Badge } from "@/components/ui/badge";
import { isCargoPaid, isProductPaid } from "@/lib/payment-status";
import { orderSummaryLabel } from "@/lib/status-labels";
import type { CargoPaymentStatus, FulfillmentStatus, ProductPaymentStatus } from "@/lib/types";

type StatusPillProps = {
  productPaymentStatus: ProductPaymentStatus;
  cargoPaymentStatus?: CargoPaymentStatus;
  fulfillment: FulfillmentStatus;
  compact?: boolean;
};

export function StatusPill({
  productPaymentStatus,
  cargoPaymentStatus,
  fulfillment,
  compact,
}: StatusPillProps) {
  const label = orderSummaryLabel(productPaymentStatus, fulfillment, cargoPaymentStatus);
  let variant: "warning" | "default" | "success" | "secondary" | "muted" = "secondary";

  if (!isProductPaid(productPaymentStatus)) variant = "warning";
  else if (fulfillment === "delivered") variant = "success";
  else if (cargoPaymentStatus && isCargoPaid(cargoPaymentStatus)) variant = "success";
  else if (fulfillment === "cargo_invoiced" && cargoPaymentStatus === "awaiting") variant = "warning";

  return (
    <Badge variant={variant} className={compact ? "text-[10px] px-2" : undefined}>
      {label}
    </Badge>
  );
}
