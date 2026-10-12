"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [thbMmkRate, setThbMmkRate] = useState(initial.thbMmkRate);
  const [defaultServiceFeePercent, setDefaultServiceFeePercent] = useState(initial.defaultServiceFeePercent);
  const [paymentInstructions, setPaymentInstructions] = useState(initial.paymentInstructions);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTenantSettings({
        shopName,
        thbMmkRate,
        defaultServiceFeePercent,
        paymentInstructions,
      });
      setMessage(result.ok ? "Saved." : result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rate">Default THB → MMK rate</Label>
        <Input
          id="rate"
          type="number"
          step="0.01"
          value={thbMmkRate}
          onChange={(e) => setThbMmkRate(Number(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee-percent">Default agent fee (% of THB total)</Label>
        <Input
          id="fee-percent"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={defaultServiceFeePercent}
          onChange={(e) => setDefaultServiceFeePercent(Number(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shop">Shop name</Label>
        <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pay">Payment instructions (MMK)</Label>
        <textarea
          id="pay"
          className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
        />
      </div>
      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save defaults"}
      </Button>
      {message && (
        <p className={`text-sm ${message === "Saved." ? "text-muted-foreground" : "text-destructive"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
