"use client";

import { useMemo, useState } from "react";

import { InvoiceLineItems } from "@/components/order4u/invoice-line-items";
import { InvoiceBlock } from "@/components/order4u/money-row";
import type { InvoiceLineDisplay } from "@/lib/invoice-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_TENANT_SETTINGS } from "@/lib/agent-settings";
import { buildProductInvoice } from "@/lib/product-invoice-calc";

type ProductInvoiceEditorProps = {
  thbSubtotal: number;
  /** Controlled TH shipping (use with onThbShippingChange). */
  thbShipping?: number;
  onThbShippingChange?: (value: number) => void;
  /** When set, shipping is the sum of line fees and cannot be edited here. */
  shippingReadOnly?: boolean;
  rate?: number;
  onRateChange?: (value: number) => void;
  /** THB off the goods subtotal. */
  discountThb?: number;
  onDiscountChange?: (value: number) => void;
  /** Default / display hint when fee is uncontrolled. */
  initialFeePercent?: number;
  /** Controlled agent fee % (use with onFeePercentChange). */
  feePercent?: number;
  onFeePercentChange?: (value: number) => void;
  /** Customer orders use the shop default and cannot change the fee. */
  feeReadOnly?: boolean;
  title?: string;
  lines?: InvoiceLineDisplay[];
};

export function ProductInvoiceEditor({
  thbSubtotal,
  thbShipping: thbShippingProp = 0,
  onThbShippingChange,
  shippingReadOnly = false,
  rate = DEFAULT_TENANT_SETTINGS.thbMmkRate,
  onRateChange,
  discountThb = 0,
  onDiscountChange,
  initialFeePercent = DEFAULT_TENANT_SETTINGS.defaultServiceFeePercent,
  feePercent: feePercentProp,
  onFeePercentChange,
  feeReadOnly = false,
  title = "Product invoice preview",
  lines,
}: ProductInvoiceEditorProps) {
  const [internalFee, setInternalFee] = useState(initialFeePercent);
  const [internalShipping, setInternalShipping] = useState(thbShippingProp);
  const [rateText, setRateText] = useState(String(rate));
  const [discountText, setDiscountText] = useState(discountThb > 0 ? String(discountThb) : "");

  const feeControlled = feePercentProp !== undefined && onFeePercentChange !== undefined;
  const shippingControlled = onThbShippingChange !== undefined;

  const feePercent = feeControlled ? feePercentProp : internalFee;
  const shipping = shippingReadOnly || shippingControlled ? thbShippingProp : internalShipping;

  const setFeePercent = (value: number) => {
    if (feeControlled) onFeePercentChange!(value);
    else setInternalFee(value);
  };

  const setShipping = (value: number) => {
    if (shippingControlled) onThbShippingChange!(value);
    else setInternalShipping(value);
  };

  const snapshot = useMemo(
    () =>
      buildProductInvoice({
        thbSubtotal,
        thbShipping: shipping,
        rate,
        discountThb,
        serviceFeePercent: feePercent,
      }),
    [thbSubtotal, shipping, rate, discountThb, feePercent],
  );

  const showRate = onRateChange !== undefined;
  const showDiscount = onDiscountChange !== undefined;

  return (
    <div className="space-y-4">
      {(!feeReadOnly || !shippingReadOnly || showRate || showDiscount) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!feeReadOnly && (
            <div className="space-y-2">
              <Label htmlFor="fee-percent">Supplier fee (% of THB total)</Label>
              <Input
                id="fee-percent"
                type="number"
                min={0}
                max={100}
                step="0.1"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) => setFeePercent(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Default from settings is {initialFeePercent}%.</p>
            </div>
          )}
          {showRate && (
            <div className="space-y-2">
              <Label htmlFor="invoice-rate">Exchange rate (MMK per THB)</Label>
              <Input
                id="invoice-rate"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={rateText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setRateText(raw);
                  const next = Number(raw);
                  if (raw.trim() !== "" && Number.isFinite(next) && next > 0) onRateChange!(next);
                }}
              />
            </div>
          )}
          {showDiscount && (
            <div className="space-y-2">
              <Label htmlFor="invoice-discount">Discount (THB)</Label>
              <Input
                id="invoice-discount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={discountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDiscountText(raw);
                  if (raw.trim() === "") {
                    onDiscountChange!(0);
                    return;
                  }
                  const next = Number(raw);
                  if (Number.isFinite(next) && next >= 0) onDiscountChange!(next);
                }}
              />
            </div>
          )}
          {!shippingReadOnly && (
            <div className="space-y-2">
              <Label htmlFor="th-shipping">Thai shipping (THB)</Label>
              <Input
                id="th-shipping"
                type="number"
                min={0}
                step="1"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>
      )}

      {lines && lines.length > 0 && <InvoiceLineItems lines={lines} />}

      <InvoiceBlock title={title} snapshot={snapshot} hideShipping />
    </div>
  );
}
