"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { CatalogItemBadge, ItemSearchCombobox } from "@/components/order4u/item-search-combobox";
import { ProductInvoiceEditor } from "@/components/order4u/product-invoice-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { TenantSettings } from "@/lib/agent-settings";
import { fmtThb } from "@/lib/format-money";
import { isLazadaShortUrl } from "@/lib/lazada";
import { isShopeeShortUrl } from "@/lib/shopee";
import type { CatalogItem } from "@/lib/types";
import { createOrder } from "@/server/actions/agent-orders";
import { lookupProductUrl } from "@/server/actions/shopee";

type DraftLine = {
  title: string;
  url: string;
  qty: number;
  price: number;
  shippingFee: number;
  catalogItemId?: string;
  shopeeShopId?: string;
  shopeeItemId?: string;
};

const DEFAULT_LINE: DraftLine = { title: "", url: "", qty: 1, price: 0, shippingFee: 0 };

type NewOrderFormProps = {
  tenantDefaults: TenantSettings;
};

export function NewOrderForm({ tenantDefaults }: NewOrderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [feePercent, setFeePercent] = useState(tenantDefaults.defaultServiceFeePercent);
  const [lines, setLines] = useState<DraftLine[]>([{ ...DEFAULT_LINE }]);
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [lineNotes, setLineNotes] = useState<Record<number, string>>({});

  const quotedSubtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0),
    [lines],
  );
  const shippingTotal = useMemo(() => lines.reduce((s, l) => s + (l.shippingFee || 0), 0), [lines]);

  function addLine() {
    setLines((prev) => [...prev, { ...DEFAULT_LINE }]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function applyCatalogItem(index: number, item: CatalogItem) {
    updateLine(index, {
      title: item.name,
      url: item.url,
      price: item.price,
      catalogItemId: item.id,
      shopeeShopId: undefined,
      shopeeItemId: undefined,
    });
  }

  async function fetchListing(index: number) {
    const url = lines[index]?.url.trim() ?? "";
    setLineErrors((prev) => ({ ...prev, [index]: "" }));
    setLineNotes((prev) => ({ ...prev, [index]: "" }));
    setFetchingIndex(index);
    const result = await lookupProductUrl(url);
    setFetchingIndex(null);
    if (!result.ok) {
      setLineErrors((prev) => ({ ...prev, [index]: result.error }));
      return;
    }
    const currentUrl = lines[index]?.url ?? "";
    const replaceUrl =
      (isShopeeShortUrl(currentUrl) || isLazadaShortUrl(currentUrl)) && result.canonicalUrl
        ? result.canonicalUrl
        : undefined;
    updateLine(index, {
      title: result.title,
      ...(result.priceThb != null ? { price: result.priceThb } : {}),
      ...(replaceUrl ? { url: replaceUrl } : {}),
      ...(result.shopId && result.itemId
        ? { shopeeShopId: result.shopId, shopeeItemId: result.itemId }
        : { shopeeShopId: undefined, shopeeItemId: undefined }),
    });
    if (result.priceThb != null) return;
    setLineNotes((prev) => ({
      ...prev,
      [index]:
        result.source === "video"
          ? "This link is a Shopee video, not a product page. Filled the caption. Enter the THB price."
          : "Name filled. Enter the THB price.",
    }));
  }

  function submit() {
    setError(null);
    const validLines = lines.filter((l) => l.title.trim() && l.url.trim() && l.price >= 0);
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (validLines.length === 0) {
      setError("Add at least one line with name, URL, and price.");
      return;
    }

    startTransition(async () => {
      const result = await createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        thbShipping: shippingTotal,
        serviceFeePercent: feePercent,
        lines: validLines.map((l) => ({
          title: l.title.trim(),
          url: l.url.trim(),
          qty: l.qty || 1,
          price: l.price,
          shippingFeeThb: l.shippingFee || 0,
          catalogItemId: l.catalogItemId,
          ...(l.shopeeShopId && l.shopeeItemId
            ? { shopeeShopId: l.shopeeShopId, shopeeItemId: l.shopeeItemId }
            : {}),
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.orderId ? `/agent/orders/${result.orderId}` : "/agent/orders");
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="name" required>
              Name
            </FieldLabel>
            <Input 
            id="name" 
            value={customerName} 
            onChange={(e) => setCustomerName(e.target.value)} 
            placeholder="Type name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Type phone number (optional)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-4">
        {lines.map((line, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Item {i + 1}</CardTitle>
                <CatalogItemBadge catalogItemId={line.catalogItemId} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <FieldLabel required>Product URL</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={line.url}
                    onChange={(e) => {
                      updateLine(i, {
                        url: e.target.value,
                        catalogItemId: undefined,
                        shopeeShopId: undefined,
                        shopeeItemId: undefined,
                      });
                      setLineErrors((prev) => ({ ...prev, [i]: "" }));
                      setLineNotes((prev) => ({ ...prev, [i]: "" }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={fetchingIndex === i || !line.url.trim()}
                    onClick={() => fetchListing(i)}
                  >
                    {fetchingIndex === i ? "Fetching…" : "Fetch info"}
                  </Button>
                </div>
                {lineErrors[i] ? <p className="text-sm text-destructive">{lineErrors[i]}</p> : null}
                {lineNotes[i] ? <p className="text-sm text-muted-foreground">{lineNotes[i]}</p> : null}
              </div>
              <ItemSearchCombobox
                value={line.title}
                onChange={(title) => updateLine(i, { title, catalogItemId: undefined })}
                onSelect={(item) => applyCatalogItem(i, item)}
                required
              />
              <div className="grid grid-cols-3 gap-3">
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
                <div className="space-y-2">
                  <Label>Shipping (THB)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.shippingFee || ""}
                    onChange={(e) => updateLine(i, { shippingFee: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Line total: {fmtThb((line.price || 0) * (line.qty || 0))} · shipping {fmtThb(line.shippingFee || 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" className="mt-4 w-full" onClick={addLine}>
        Add another item
      </Button>

      <Separator className="my-6" />

      <ProductInvoiceEditor
        thbSubtotal={quotedSubtotal}
        thbShipping={shippingTotal}
        shippingReadOnly
        feePercent={feePercent}
        onFeePercentChange={setFeePercent}
        rate={tenantDefaults.thbMmkRate}
        initialFeePercent={tenantDefaults.defaultServiceFeePercent}
        title="Product invoice preview"
        lines={lines
          .filter((l) => l.title.trim())
          .map((l) => ({ title: l.title.trim(), qty: l.qty || 1, price: l.price || 0 }))}
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="flex-1" size="lg" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save & create invoice"}
        </Button>
        <Button type="button" variant="ghost" className="flex-1" onClick={() => router.push("/agent/orders")}>
          Cancel
        </Button>
      </div>
    </>
  );
}
