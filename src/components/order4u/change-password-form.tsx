"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import {
  MAX_PASSWORD,
  MIN_SET_PASSWORD,
  changePasswordSchema,
  firstIssueMessage,
} from "@/lib/input-rules";
import { changeOwnPassword } from "@/server/actions/change-password";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const checked = changePasswordSchema.safeParse({
      currentPassword: String(fd.get("currentPassword") ?? ""),
      newPassword: String(fd.get("newPassword") ?? ""),
      confirmPassword: String(fd.get("confirmPassword") ?? ""),
    });
    if (!checked.success) {
      setError(firstIssueMessage(checked.error, "Check the form."));
      return;
    }
    startTransition(async () => {
      const result = await changeOwnPassword(checked.data);
      if (result?.ok === false) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <FieldLabel htmlFor="currentPassword" required>
          Current password
        </FieldLabel>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          maxLength={MAX_PASSWORD}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="newPassword" required>
          New password
        </FieldLabel>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_PASSWORD}
          placeholder={`At least ${MIN_SET_PASSWORD} characters`}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="confirmPassword" required>
          Confirm new password
        </FieldLabel>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_PASSWORD}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
