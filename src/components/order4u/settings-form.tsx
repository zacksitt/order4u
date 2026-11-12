"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_INSTRUCTIONS,
  MAX_NAME,
  firstIssueMessage,
  tenantSettingsSchema,
} from "@/lib/input-rules";
import { updateTenantSettings } from "@/server/actions/settings";

type SettingsFormProps = {
  initial: {
    shopName: string;
    thbMmkRate: number;
    defaultServiceFeePercent: number;
    paymentInstructions: string;
  };
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const [shopName, setShopName] = useState(initial.shopName);
  const [thbMmkRate, setThbMmkRate] = useState(String(initial.thbMmkRate));
  const [defaultServiceFeePercent, setDefaultServiceFeePercent] = useState(
    String(initial.defaultServiceFeePercent),
  );
  const [paymentInstructions, setPaymentInstructions] = useState(initial.paymentInstructions);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    const checked = tenantSettingsSchema.safeParse({
      shopName,
      thbMmkRate: Number(thbMmkRate),
      defaultServiceFeePercent: Number(defaultServiceFeePercent),
      paymentInstructions,
    });
    if (!checked.success) {
      setMessage({ ok: false, text: firstIssueMessage(checked.error, "Invalid settings.") });
      return;
    }
    startTransition(async () => {
      const result = await updateTenantSettings(checked.data);
      setMessage(result.ok ? { ok: true, text: "Settings saved." } : { ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="shop">Shop name</Label>
        <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} maxLength={MAX_NAME} />
        <p className="text-xs text-muted-foreground">Shown to customers on invoices and tracking pages.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rate">THB to MMK rate</Label>
        <Input
          id="rate"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={thbMmkRate}
          onChange={(e) => setThbMmkRate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Default for new orders. An unpaid order can use a different rate.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee-percent">Default supplier fee (% of THB total)</Label>
        <Input
          id="fee-percent"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.1"
          value={defaultServiceFeePercent}
          onChange={(e) => setDefaultServiceFeePercent(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Agents can change it per order. Customer orders always use this.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pay">Payment instructions</Label>
        <textarea
          id="pay"
          className="flex min-h-[100px] w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm"
          placeholder="e.g. KBZPay 09 123 456 789 (Ko Aung). Send a screenshot after paying."
          value={paymentInstructions}
          maxLength={MAX_INSTRUCTIONS}
          onChange={(e) => setPaymentInstructions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Shown to customers on the order form.</p>
      </div>
      <Button className="w-full sm:w-auto" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}>{message.text}</p>
      )}
    </div>
  );
}
