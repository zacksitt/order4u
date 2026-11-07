"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentOrdersHref } from "@/lib/agent-orders-href";
import { MAX_SEARCH } from "@/lib/input-rules";
import type { CustomerSearchHit } from "@/server/queries/customers";
import { searchCustomersAction } from "@/server/actions/customers";

export function OrdersCustomerFilter({
  selected,
  view,
}: {
  selected: { id: string; name: string } | null;
  view?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      searchCustomersAction(query.slice(0, MAX_SEARCH))
        .then((items) => {
          if (!cancelled) setResults(items.slice(0, 8));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  function pick(customer: CustomerSearchHit) {
    setOpen(false);
    setQuery("");
    startTransition(() => {
      router.push(agentOrdersHref({ view, customer: customer.id }));
    });
  }

  return (
    <div className="mb-4 space-y-2">
      <Label htmlFor="orders-customer">Customer</Label>
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{selected.name}</p>
          <Button asChild type="button" variant="ghost" size="sm" disabled={pending}>
            <Link href={agentOrdersHref({ view })}>Clear</Link>
          </Button>
        </div>
      ) : (
        <div className="relative sm:max-w-xs">
          <Input
            id="orders-customer"
            value={query}
            placeholder="Filter by customer…"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <>
              <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card text-card-foreground shadow-md">
                <ul className="max-h-56 overflow-auto p-1" role="listbox">
                  {loading ? (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</li>
                  ) : results.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {query.trim() ? "No matching customers." : "Type to search customers."}
                    </li>
                  ) : (
                    results.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pick(customer)}
                        >
                          <p className="font-medium truncate w-full">{customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate w-full">
                            {[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact yet"}
                          </p>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close search"
                onClick={() => setOpen(false)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
