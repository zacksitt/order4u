"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { CustomerSearchCombobox } from "@/components/order4u/customer-search-combobox";
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
import {
  MAX_CUSTOMER_NOTE,
  MAX_ITEM_TITLE,
  MAX_NAME,
  MAX_QTY,
  MAX_URL,
  agentCreateOrderSchema,
  customerCreateOrderSchema,
  firstIssueMessage,
} from "@/lib/input-rules";
import { isLazadaShortUrl } from "@/lib/lazada";
import { isShopeeShortUrl } from "@/lib/shopee";
import type { CatalogItem } from "@/lib/types";
import { createOrder } from "@/server/actions/agent-orders";
import { createCustomerOrder } from "@/server/actions/customer-orders";
import { lookupProductUrl } from "@/server/actions/shopee";

type DraftLine = {
  title: string;
  url: string;
  qty: number;
  price: number;
  shippingFee: number;
  marketplace: "shopee" | "lazada";
  customerNote: string;
  catalogItemId?: string;
  shopeeShopId?: string;
  shopeeItemId?: string;
};

const DEFAULT_LINE: DraftLine = {
  title: "",
  url: "",
  qty: 1,
  price: 0,
  shippingFee: 0,
  marketplace: "shopee",
  customerNote: "",
};

type NewOrderFormProps = {
  tenantDefaults: TenantSettings;
  /** Customer login can create an order but cannot change the shop fee. */
  mode?: "agent" | "customer";
  initialCustomer?: { name: string; phone: string };
};

export function NewOrderForm({ tenantDefaults, mode = "agent", initialCustomer }: NewOrderFormProps) {
  const router = useRouter();
  const isCustomer = mode === "customer";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? "");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [feePercent, setFeePercent] = useState(tenantDefaults.defaultServiceFeePercent);
  const [lines, setLines] = useState<DraftLine[]>([{ ...DEFAULT_LINE }]);
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [lineNotes, setLineNotes] = useState<Record<number, string>>({});
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const quotedSubtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0),
    [lines],
  );
  const shippingTotal = useMemo(() => lines.reduce((s, l) => s + (l.shippingFee || 0), 0), [lines]);

  function addLine() {
    setLines((prev) => [...prev, { ...DEFAULT_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setLineErrors({});
    setLineNotes({});
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
    const url = linesRef.current[index]?.url.trim() ?? "";
    setLineErrors((prev) => ({ ...prev, [index]: "" }));
    setLineNotes((prev) => ({ ...prev, [index]: "" }));
    setFetchingIndex(index);
    const result = await lookupProductUrl(url);
    setFetchingIndex(null);
    if (!result.ok) {
      setLineErrors((prev) => ({ ...prev, [index]: result.error }));
      return;
    }
    const currentUrl = linesRef.current[index]?.url ?? "";
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
    const filledLines = lines.filter((l) => l.title.trim() || l.url.trim() || l.price > 0);
    if (filledLines.length === 0) {
      setError("Add at least one item with a name and price.");
      return;
    }

    const payloadLines = filledLines.map((l) => ({
      title: l.title,
      url: l.url,
      qty: l.qty,
      price: l.price,
      shippingFeeThb: isCustomer ? 0 : l.shippingFee || 0,
      marketplace: isCustomer ? l.marketplace : undefined,
      ...(l.customerNote.trim() ? { customerNote: l.customerNote.trim() } : {}),
      ...(l.catalogItemId ? { catalogItemId: l.catalogItemId } : {}),
      ...(l.shopeeShopId && l.shopeeItemId
        ? { shopeeShopId: l.shopeeShopId, shopeeItemId: l.shopeeItemId }
        : {}),
    }));

    if (isCustomer) {
      const checked = customerCreateOrderSchema.safeParse({
        customerName,
        customerPhone,
        lines: payloadLines,
      });
      if (!checked.success) {
        setError(firstIssueMessage(checked.error, "Check the form and try again."));
        return;
      }
      startTransition(async () => {
        const result = await createCustomerOrder(checked.data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/customer/orders/${result.orderId}`);
        router.refresh();
      });
      return;
    }

    const checked = agentCreateOrderSchema.safeParse({
      customerName,
      customerPhone,
      customerId,
      thbShipping: shippingTotal,
      serviceFeePercent: feePercent,
      lines: payloadLines,
    });
    if (!checked.success) {
      setError(firstIssueMessage(checked.error, "Check the form and try again."));
      return;
    }

    startTransition(async () => {
      const result = await createOrder(checked.data);
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
          <CardTitle className="text-base">{isCustomer ? "Your details" : "Customer"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCustomer ? (
            <>
              <div className="space-y-2">
                <FieldLabel htmlFor="name" required>
                  Name
                </FieldLabel>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ma Thida"
                  autoComplete="name"
                  maxLength={MAX_NAME}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 09 123 456 789"
                  autoComplete="tel"
                  maxLength={20}
                />
              </div>
            </>
          ) : (
            <>
              <CustomerSearchCombobox
                value={customerName}
                onChange={(name) => {
                  setCustomerName(name);
                  setCustomerId(undefined);
                }}
                onSelect={(customer) => {
                  setCustomerId(customer.id);
                  setCustomerName(customer.name);
                  setCustomerPhone(customer.phone);
                }}
                onAddNew={(name) => {
                  setCustomerId(undefined);
                  setCustomerName(name);
                }}
              />
              {customerId ? (
                <p className="text-xs text-muted-foreground">Existing customer. Login is set on the Customers page.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  New customer. Add email and password later on the Customers page if they need to sign in.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 09 123 456 789"
                  autoComplete="tel"
                  maxLength={20}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 space-y-4">
        {lines.map((line, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Item {i + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isCustomer && <CatalogItemBadge catalogItemId={line.catalogItemId} />}
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isCustomer && (
                <div className="space-y-2">
                  <FieldLabel htmlFor={`source-${i}`} required>
                    Source
                  </FieldLabel>
                  <select
                    id={`source-${i}`}
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
              )}
              <div className="space-y-2">
                <FieldLabel htmlFor={`url-${i}`}>Product URL (Shopee / Lazada)</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id={`url-${i}`}
                    value={line.url}
                    placeholder="https://shopee.co.th/…"
                    maxLength={MAX_URL}
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
                    className="w-full shrink-0 sm:w-auto"
                    disabled={fetchingIndex === i || !line.url.trim()}
                    onClick={() => fetchListing(i)}
                  >
                    {fetchingIndex === i ? "Getting details…" : "Get name & price"}
                  </Button>
                </div>
                {lineErrors[i] ? <p className="text-sm text-destructive">{lineErrors[i]}</p> : null}
                {lineNotes[i] ? <p className="text-sm text-muted-foreground">{lineNotes[i]}</p> : null}
              </div>
              {isCustomer ? (
                <div className="space-y-2">
                  <FieldLabel htmlFor={`title-${i}`} required>
                    Item name
                  </FieldLabel>
                  <Input
                    id={`title-${i}`}
                    value={line.title}
                    placeholder="e.g. Cotton T-shirt, size M"
                    onChange={(e) => updateLine(i, { title: e.target.value })}
                    maxLength={MAX_ITEM_TITLE}
                  />
                </div>
              ) : (
                <ItemSearchCombobox
                  value={line.title}
                  onChange={(title) => updateLine(i, { title, catalogItemId: undefined })}
                  onSelect={(item) => applyCatalogItem(i, item)}
                  required
                />
              )}
              <div
                className={
                  isCustomer ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-1 gap-3 sm:grid-cols-3"
                }
              >
                <div className="min-w-0 space-y-2">
                  <FieldLabel htmlFor={`qty-${i}`} required>
                    Qty
                  </FieldLabel>
                  <Input
                    id={`qty-${i}`}
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={line.qty}
                    onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <FieldLabel htmlFor={`price-${i}`} required>
                    Price (THB)
                  </FieldLabel>
                  <Input
                    id={`price-${i}`}
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={line.price || ""}
                    onChange={(e) => updateLine(i, { price: Number(e.target.value) || 0 })}
                  />
                </div>
                {!isCustomer && (
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`ship-${i}`}>Thai shipping (THB)</Label>
                    <Input
                      id={`ship-${i}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.shippingFee || ""}
                      onChange={(e) => updateLine(i, { shippingFee: Number(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
              {isCustomer && (
                <div className="space-y-2">
                  <Label htmlFor={`note-${i}`}>Notes or product options</Label>
                  <textarea
                    id={`note-${i}`}
                    className="flex min-h-[72px] w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm"
                    value={line.customerNote}
                    onChange={(e) => updateLine(i, { customerNote: e.target.value })}
                    maxLength={MAX_CUSTOMER_NOTE}
                    placeholder="Size, color, variant…"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const items = (line.price || 0) * (line.qty || 0);
                  const shipping = line.shippingFee || 0;
                  if (isCustomer) return `Item total: ${fmtThb(items)}`;
                  return `Items ${fmtThb(items)} + shipping ${fmtThb(shipping)} = ${fmtThb(items + shipping)}`;
                })()}
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
        onFeePercentChange={isCustomer ? undefined : setFeePercent}
        feeReadOnly={isCustomer}
        rate={tenantDefaults.thbMmkRate}
        initialFeePercent={tenantDefaults.defaultServiceFeePercent}
        title={isCustomer ? "Estimated total" : "Product invoice preview"}
        lines={lines
          .filter((l) => l.title.trim())
          .map((l) => ({
            title: l.title.trim(),
            qty: l.qty || 1,
            price: l.price || 0,
            shippingFeeThb: isCustomer ? 0 : l.shippingFee || 0,
          }))}
      />

      {isCustomer && (
        <p className="mt-3 text-xs text-muted-foreground">
          Thai shipping is added by the shop after they check your items. Your final invoice may change slightly.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="flex-1" size="lg" onClick={submit} disabled={pending}>
          {pending ? (isCustomer ? "Placing order…" : "Creating…") : isCustomer ? "Place order" : "Create order"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => router.push(isCustomer ? "/customer/orders" : "/agent/orders")}
        >
          Cancel
        </Button>
      </div>
    </>
  );
}
