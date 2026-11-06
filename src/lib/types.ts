export type ItemStatus =
  | "pending_purchase"
  | "purchased"
  | "seller_shipped"
  | "arrived_at_agent"
  | "cancelled";

export type FulfillmentStatus =
  | "collecting"
  | "ready_for_cargo"
  | "handed_to_cargo"
  | "cargo_received"
  | "cargo_checking"
  | "cargo_check_ok"
  | "cargo_check_exception"
  | "cargo_invoiced"
  | "in_transit"
  | "delivered";

/** Product invoice payment — stored on `orders.product_payment_status`. */
export type ProductPaymentStatus = "awaiting" | "paid";

/**
 * Cargo invoice payment — stored on `orders.cargo_payment_status`.
 * `not_applicable` until a cargo invoice exists.
 */
export type CargoPaymentStatus = "not_applicable" | "awaiting" | "paid";

export type InvoiceSnapshot = {
  thbSubtotal: number;
  thbShipping: number;
  mmkTotal: number;
  rate: number;
  /** Agent fee % of THB total (goods + TH shipping), locked at invoice issue. */
  serviceFeePercent: number;
  /** Fee in THB from percent (informational on invoice). */
  serviceFeeThb: number;
  serviceFeeMmk: number;
};

/**
 * Tenant item catalog (`items` table) — reusable lines for order create search.
 */
export type CatalogItem = {
  id: string;
  name: string;
  url: string;
  /** Default quoted THB (customer / product invoice). */
  price: number;
  description?: string;
};

/** Cargo price list. Price is THB per unit and feeds the suggested cargo fee. */
export type ItemCategory = {
  id: string;
  name: string;
  cargoPriceThb: number;
};

export type CargoStaffUser = {
  id: string;
  displayName: string;
  email: string;
};

export type OrderItem = {
  id: string;
  /** Display name / variant (may copy from catalog `name`). */
  title: string;
  url: string;
  qty: number;
  status: ItemStatus;
  /** Quoted THB per unit — shown to customer on invoice/track. */
  price: number;
  /** Thailand shipping for this line, in THB. Summed into the product invoice. */
  shippingFeeThb?: number;
  /** Actual THB agent paid per unit — agent only; set after marketplace purchase. */
  actualPrice?: number;
  /** Optional link to catalog row used when line was added. */
  catalogItemId?: string;
  checkOk?: boolean;
  checkNote?: string;
  /** Cargo category assigned on this line. */
  categoryId?: string;
  categoryName?: string;
  /** THB per unit from the assigned category. */
  categoryCargoPriceThb?: number;
};

export type CargoInvoiceLine = {
  categoryName: string;
  qty: number;
  weightKg: number;
  /** THB per kg. */
  unitPriceThb: number;
  totalThb: number;
};

export type Order = {
  id: string;
  code: string;
  customerPhone: string;
  customerName: string;
  productPaymentStatus: ProductPaymentStatus;
  cargoPaymentStatus: CargoPaymentStatus;
  fulfillment: FulfillmentStatus;
  items: OrderItem[];
  productInvoice?: InvoiceSnapshot;
  cargoInvoice?: {
    weightKg: number;
    mmkTotal: number;
    /** Present when the warehouse entered the fee in THB. */
    thbTotal?: number;
    /** Sum of category lines before discount. */
    subtotalThb?: number;
    discountThb: number;
    lines: CargoInvoiceLine[];
  };
  publicToken: string;
  /** Set when agent hands order to cargo — cargo queue filters on this user. */
  assignedCargoUserId?: string;
};

/** Customer-facing order — no phone. */
export type PublicOrder = Omit<Order, "customerPhone"> & {
  shopName: string;
};
