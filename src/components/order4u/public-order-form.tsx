"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ProductInvoiceEditor } from "@/components/order4u/product-invoice-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fmtThb } from "@/lib/format-money";
import {
  MAX_CUSTOMER_NOTE,
  MAX_ITEM_TITLE,
  MAX_NAME,
  MAX_QTY,
  MAX_URL,
  firstIssueMessage,
  publicCreateOrderSchema,
} from "@/lib/input-rules";
import { submitPublicOrder } from "@/server/actions/public-orders";

type DraftLine = {
  title: string;
  url: string;
  qty: number | "";
  price: number;
  marketplace: "shopee" | "lazada";
  customerNote: string;
};

const DEFAULT_LINE: DraftLine = {
  title: "",
  url: "",
  qty: 1,
  price: 0,
  marketplace: "shopee",
  customerNote: "",
};

type PublicOrderFormProps = {
  shopSlug: string;
  portalToken: string;
  initialName: string;
  initialPhone: string;
  thbMmkRate: number;
  serviceFeePercent: number;
  paymentInstructions: string;
};

export function PublicOrderForm({
  shopSlug,
  portalToken,
  initialName,
  initialPhone,
  thbMmkRate,
  serviceFeePercent,
  paymentInstructions,
}: PublicOrderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(initialName);
  const [customerPhone, setCustomerPhone] = useState(initialPhone === "—" ? "" : initialPhone);
  const [lines, setLines] = useState<DraftLine[]>([{ ...DEFAULT_LINE }]);

  const quotedSubtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0),
    [lines],
  );

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function submit() {
    setError(null);
    const filledLines = lines.filter((l) => l.title.trim() || l.url.trim() || l.price > 0);
    if (filledLines.length === 0) {
      setError("Add at least one item with a name and price.");
      return;
    }
    const checked = publicCreateOrderSchema.safeParse({
      shopSlug,
      portalToken,
      customerName,
      customerPhone,
      lines: filledLines.map((l) => ({
        title: l.title,
        url: l.url,
        qty: l.qty,
        price: l.price,
        marketplace: l.marketplace,
        ...(l.customerNote.trim() ? { customerNote: l.customerNote.trim() } : {}),
      })),
    });
    if (!checked.success) {
      setError(firstIssueMessage(checked.error, "Check the form and try again."));
      return;
    }

    startTransition(async () => {
      const result = await submitPublicOrder(checked.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/o/${result.publicAccessToken}`);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="pub-name" required>
              Name
            </FieldLabel>
            <Input
              id="pub-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={MAX_NAME}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pub-phone">Phone (optional)</Label>
            <Input
              id="pub-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="For delivery updates"
              maxLength={20}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-4">
        {lines.map((line, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Item {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <FieldLabel required>Source</FieldLabel>
                <select
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm"
                  value={line.marketplace}
                  onChange={(e) =>
                    updateLine(i, { marketplace: e.target.value === "lazada" ? "lazada" : "shopee" })
                  }
                >
                  <option value="shopee">Shopee</option>
                  <option value="lazada">Lazada</option>
                </select>
              </div>
              <div className="space-y-2">
                <FieldLabel>Product URL (Shopee / Lazada)</FieldLabel>
                <Input
                  value={line.url}
                  onChange={(e) => updateLine(i, { url: e.target.value })}
                  placeholder="https://..."
                  maxLength={MAX_URL}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Item name</FieldLabel>
                <Input
                  value={line.title}
                  onChange={(e) => updateLine(i, { title: e.target.value })}
                  maxLength={MAX_ITEM_TITLE}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <FieldLabel required>Qty</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={line.qty}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        updateLine(i, { qty: "" });
                        return;
                      }
                      const next = Number(raw);
                      updateLine(i, { qty: Number.isFinite(next) ? next : "" });
                    }}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <FieldLabel required>Price (THB)</FieldLabel>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={line.price || ""}
                    onChange={(e) => updateLine(i, { price: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes or product options</Label>
                <textarea
                  className="flex min-h-[72px] w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm"
                  value={line.customerNote}
                  onChange={(e) => updateLine(i, { customerNote: e.target.value })}
                  maxLength={MAX_CUSTOMER_NOTE}
                  placeholder="Size, color, variant…"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Line total: {fmtThb((line.price || 0) * (line.qty || 0))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setLines((p) => [...p, { ...DEFAULT_LINE }])}>
        Add another item
      </Button>

      <Separator className="my-6" />

      <ProductInvoiceEditor
        thbSubtotal={quotedSubtotal}
        thbShipping={0}
        shippingReadOnly
        feeReadOnly
        feePercent={serviceFeePercent}
        rate={thbMmkRate}
        initialFeePercent={serviceFeePercent}
        title="Estimated total"
        lines={lines
          .filter((l) => l.title.trim())
          .map((l) => ({ title: l.title.trim(), qty: l.qty || 1, price: l.price || 0 }))}
      />

      {paymentInstructions.trim() && (
        <Card className="mt-4">
          <CardContent className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {paymentInstructions}
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button type="button" className="mt-6 w-full" size="lg" onClick={submit} disabled={pending}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </>
  );
}
