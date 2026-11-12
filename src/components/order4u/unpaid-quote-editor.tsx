"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstIssueMessage, updateUnpaidQuoteSchema } from "@/lib/input-rules";
import type { Order } from "@/lib/types";
import { updateUnpaidOrderQuote } from "@/server/actions/agent-orders";

type DraftLine = {
  key: string;
  id?: string;
  title: string;
  qty: string;
  price: string;
  shipping: string;
};

function draftFromOrder(order: Order): DraftLine[] {
  return order.items.map((item) => ({
    key: item.id,
    id: item.id,
    title: item.title,
    qty: String(item.qty),
    price: String(item.price),
    shipping: item.shippingFeeThb ? String(item.shippingFeeThb) : "",
  }));
}

export function UnpaidQuoteEditor({
  order,
  onCancel,
  onSaved,
}: {
  order: Order;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const invoice = order.productInvoice;
  const [lines, setLines] = useState<DraftLine[]>(() => draftFromOrder(order));
  const [rate, setRate] = useState(invoice ? String(invoice.rate) : "");
  const [discount, setDiscount] = useState(invoice && invoice.discountThb > 0 ? String(invoice.discountThb) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patchLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: `new-${crypto.randomUUID()}`, title: "", qty: "1", price: "", shipping: "" },
    ]);
  }

  function save() {
    setError(null);
    const payload = {
      orderId: order.id,
      rate: Number(rate),
      discountThb: discount.trim() === "" ? 0 : Number(discount),
      lines: lines.map((line) => ({
        ...(line.id ? { id: line.id } : {}),
        title: line.title,
        qty: Number(line.qty),
        price: Number(line.price),
        shippingFeeThb: line.shipping.trim() === "" ? 0 : Number(line.shipping),
      })),
    };
    const checked = updateUnpaidQuoteSchema.safeParse(payload);
    if (!checked.success) {
      setError(firstIssueMessage(checked.error, "Check the quote and try again."));
      return;
    }
    const goods = checked.data.lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    if (checked.data.discountThb > goods) {
      setError("Discount cannot be more than the item total.");
      return;
    }
    startTransition(async () => {
      const result = await updateUnpaidOrderQuote(checked.data);
      if (!result.ok) setError(result.error);
      else {
        onSaved();
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4 rounded-[14px] border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">Edit invoice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change, add, or remove items until the customer pays. At least one item stays on the invoice.
        </p>
      </div>
      {lines.map((line, index) => (
        <div key={line.key} className="space-y-3 border-t border-border pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor={`quote-title-${line.key}`}>Item</Label>
              <Input
                id={`quote-title-${line.key}`}
                value={line.title}
                onChange={(event) => patchLine(index, { title: event.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={lines.length <= 1 || pending}
              onClick={() => removeLine(index)}
            >
              Remove
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`quote-qty-${line.key}`}>Qty</Label>
              <Input
                id={`quote-qty-${line.key}`}
                type="number"
                min={1}
                value={line.qty}
                onChange={(event) => patchLine(index, { qty: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quote-price-${line.key}`}>Price (THB)</Label>
              <Input
                id={`quote-price-${line.key}`}
                type="number"
                min={0}
                step="0.01"
                value={line.price}
                onChange={(event) => patchLine(index, { price: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quote-ship-${line.key}`}>Thai shipping (THB)</Label>
              <Input
                id={`quote-ship-${line.key}`}
                type="number"
                min={0}
                step="0.01"
                value={line.shipping}
                onChange={(event) => patchLine(index, { shipping: event.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addLine} disabled={pending}>
        Add item
      </Button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quote-rate">Exchange rate (MMK per THB)</Label>
          <Input
            id="quote-rate"
            type="number"
            min={0}
            step="0.01"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quote-discount">Discount (THB)</Label>
          <Input
            id="quote-discount"
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save invoice"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
