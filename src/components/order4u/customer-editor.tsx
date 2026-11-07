"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_EMAIL,
  MAX_INSTRUCTIONS,
  MAX_NAME,
  MAX_PASSWORD,
  MIN_SET_PASSWORD,
  customerProfileSchema,
  firstIssueMessage,
} from "@/lib/input-rules";
import type { AgentCustomerRow } from "@/server/queries/customers";
import { updateAgentCustomer } from "@/server/actions/customers";

export function CustomerEditor({
  customer,
  onSaved,
}: {
  customer: AgentCustomerRow;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone === "—" ? "" : customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [password, setPassword] = useState("");
  const [facebookProfileUrl, setFacebookProfileUrl] = useState(customer.facebookProfileUrl);
  const [notes, setNotes] = useState(customer.notes);

  function save() {
    setError(null);
    const parsed = customerProfileSchema.safeParse({
      id: customer.id,
      name,
      phone,
      email,
      password,
      facebookProfileUrl,
      notes,
    });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error, "Check the form."));
      return;
    }
    startTransition(async () => {
      const result = await updateAgentCustomer(parsed.data);
      if (!result.ok) setError(result.error);
      else {
        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={MAX_EMAIL}
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={MAX_PASSWORD}
            autoComplete="new-password"
            placeholder={
              customer.hasLogin
                ? `Leave blank to keep · min ${MIN_SET_PASSWORD} to reset`
                : `Optional · at least ${MIN_SET_PASSWORD} characters`
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Facebook profile</Label>
          <Input
            value={facebookProfileUrl}
            onChange={(e) => setFacebookProfileUrl(e.target.value)}
            placeholder="https://facebook.com/…"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <textarea
          className="flex min-h-[80px] w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_INSTRUCTIONS}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" className="w-full sm:w-auto" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
