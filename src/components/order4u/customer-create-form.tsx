"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_EMAIL,
  MAX_NAME,
  MAX_PASSWORD,
  MIN_SET_PASSWORD,
  agentCreateCustomerSchema,
  firstIssueMessage,
} from "@/lib/input-rules";
import { createAgentCustomer } from "@/server/actions/customers";

export function CustomerCreateForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function save() {
    setError(null);
    const parsed = agentCreateCustomerSchema.safeParse({ name, phone, email, password });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error, "Check the form."));
      return;
    }
    startTransition(async () => {
      const result = await createAgentCustomer(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      onSaved?.();
      router.refresh();
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
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={MAX_EMAIL} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={MAX_PASSWORD}
            autoComplete="new-password"
            placeholder={`Optional · at least ${MIN_SET_PASSWORD} characters`}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" className="w-full sm:w-auto" onClick={save} disabled={pending}>
        {pending ? "Creating…" : "Create customer"}
      </Button>
    </div>
  );
}
