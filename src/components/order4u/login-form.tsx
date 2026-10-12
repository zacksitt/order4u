"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { loginWithCredentials } from "@/server/actions/login";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    startTransition(async () => {
      const result = await loginWithCredentials(email, password);
      if (result?.ok === false) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <FieldLabel htmlFor="email" required>
          Email
        </FieldLabel>
        <Input id="email" name="email" type="email" required defaultValue="agent@demo.shop" />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="password" required>
          Password
        </FieldLabel>
        <Input id="password" name="password" type="password" required defaultValue="demo" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {/* <p className="text-xs text-muted-foreground text-center">
        Demo: agent@demo.shop · cargo1@demo.shop · password <strong>demo</strong>
      </p> */}
    </form>
  );
}
