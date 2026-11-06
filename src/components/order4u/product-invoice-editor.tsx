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
  initialFeePercent = DEFAULT_TENANT_SETTINGS.defaultServiceFeePercent,
  feePercent: feePercentProp,
  onFeePercentChange,
  feeReadOnly = false,
  title = "Product invoice preview",
  lines,
}: ProductInvoiceEditorProps) {
  const [internalFee, setInternalFee] = useState(initialFeePercent);
  const [internalShipping, setInternalShipping] = useState(thbShippingProp);

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
        serviceFeePercent: feePercent,
      }),
    [thbSubtotal, shipping, rate, feePercent],
  );

  return (
    <div className="space-y-4">
      {(!feeReadOnly || !shippingReadOnly) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!feeReadOnly && (
            <div className="space-y-2">
              <Label htmlFor="fee-percent">Service fee (% of THB total)</Label>
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
