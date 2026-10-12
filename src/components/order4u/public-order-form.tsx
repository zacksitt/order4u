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
import { submitPublicOrder } from "@/server/actions/public-orders";

type DraftLine = {
  title: string;
  url: string;
  qty: number;
  price: number;
};

const DEFAULT_LINE: DraftLine = { title: "", url: "", qty: 1, price: 0 };

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
    const validLines = lines.filter((l) => l.title.trim() && l.url.trim().length >= 8 && l.price >= 0);
    if (!customerName.trim()) {
      setError("Name is required.");
      return;
    }
    if (validLines.length === 0) {
      setError("Add at least one item with name, product URL, and price (THB).");
      return;
    }

    startTransition(async () => {
      const result = await submitPublicOrder({
        shopSlug,
        portalToken,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        lines: validLines.map((l) => ({
          title: l.title.trim(),
          url: l.url.trim(),
          qty: l.qty || 1,
          price: l.price,
        })),
      });
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
            <Input id="pub-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pub-phone">Phone (optional)</Label>
            <Input
              id="pub-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="For delivery updates"
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
                <FieldLabel required>Product URL (Lazada / Shopee)</FieldLabel>
                <Input
                  value={line.url}
                  onChange={(e) => updateLine(i, { url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Item name / variant</FieldLabel>
                <Input value={line.title} onChange={(e) => updateLine(i, { title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Price (THB)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.price || ""}
                    onChange={(e) => updateLine(i, { price: Number(e.target.value) || 0 })}
                  />
                </div>
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
        rate={thbMmkRate}
        initialFeePercent={serviceFeePercent}
        title="Estimated total (MMK)"
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
        {pending ? "Submitting…" : "Submit order"}
      </Button>
    </>
  );
}
