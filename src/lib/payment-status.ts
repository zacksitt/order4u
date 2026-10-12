import type { CargoPaymentStatus, ProductPaymentStatus } from "./types";

export const PRODUCT_PAYMENT_LABEL: Record<ProductPaymentStatus, string> = {
  awaiting: "Awaiting payment",
  paid: "Paid",
};

export const CARGO_PAYMENT_LABEL: Record<CargoPaymentStatus, string> = {
  not_applicable: "Cargo N/A",
  awaiting: "Cargo awaiting",
  paid: "Cargo paid",
};

export function isProductPaid(status: ProductPaymentStatus): boolean {
  return status === "paid";
}

export function isCargoPaid(status: CargoPaymentStatus): boolean {
  return status === "paid";
}

export function isCargoPaymentApplicable(status: CargoPaymentStatus): boolean {
  return status !== "not_applicable";
}

/** Default when order is created (product invoice issued). */
export function defaultProductPayment(): ProductPaymentStatus {
  return "awaiting";
}

/** Before cargo invoice exists. */
export function defaultCargoPayment(): CargoPaymentStatus {
  return "not_applicable";
}
