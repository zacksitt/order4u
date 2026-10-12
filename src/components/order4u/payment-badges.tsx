import { Badge } from "@/components/ui/badge";
import {
  CARGO_PAYMENT_LABEL,
  isCargoPaymentApplicable,
  PRODUCT_PAYMENT_LABEL,
} from "@/lib/payment-status";
import type { CargoPaymentStatus, ProductPaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type PaymentBadgesProps = {
  productPaymentStatus: ProductPaymentStatus;
  cargoPaymentStatus: CargoPaymentStatus;
  className?: string;
};

export function PaymentBadges({
  productPaymentStatus,
  cargoPaymentStatus,
  className,
}: PaymentBadgesProps) {
  const productVariant = productPaymentStatus === "paid" ? "success" : "warning";
  const cargoVariant =
    cargoPaymentStatus === "paid"
      ? "success"
      : cargoPaymentStatus === "awaiting"
        ? "warning"
        : "muted";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant={productVariant}>
        Product · {PRODUCT_PAYMENT_LABEL[productPaymentStatus]}
      </Badge>
      {isCargoPaymentApplicable(cargoPaymentStatus) ? (
        <Badge variant={cargoVariant}>Cargo · {CARGO_PAYMENT_LABEL[cargoPaymentStatus]}</Badge>
      ) : (
        <Badge variant="muted">{CARGO_PAYMENT_LABEL.not_applicable}</Badge>
      )}
    </div>
  );
}
