"use client";

import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { agentOrdersHref } from "@/lib/agent-orders-href";
import { MAX_SEARCH } from "@/lib/input-rules";
import type { CustomerSearchHit } from "@/server/queries/customers";
import { searchCustomersAction } from "@/server/actions/customers";

type OrdersFilterDialogProps = {
  view?: string;
  customer: { id: string; name: string } | null;
  code: string;
};

export function OrdersFilterDialog({ view, customer, code }: OrdersFilterDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(customer);
  const [codeDraft, setCodeDraft] = useState(code);
  const [results, setResults] = useState<CustomerSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const activeCount = (customer ? 1 : 0) + (code ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    setPicked(customer);
    setQuery("");
    setCodeDraft(code);
  }, [open, customer, code]);

  useEffect(() => {
    if (!open || picked) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      searchCustomersAction(q.slice(0, MAX_SEARCH))
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
  }, [query, open, picked]);

  function apply() {
    startTransition(() => {
      router.push(
        agentOrdersHref({
          view,
          customer: picked?.id,
          code: codeDraft.trim(),
        }),
      );
      setOpen(false);
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(agentOrdersHref({ view }));
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={activeCount ? `Filter, ${activeCount} applied` : "Filter"}
        onClick={() => setOpen(true)}
        className="relative shrink-0"
      >
        <Filter />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <Modal
          title="Filter orders"
          description="Find by customer or order code. Status chips stay on the list."
          onClose={() => setOpen(false)}
          className="mb-[calc(7.25rem+env(safe-area-inset-bottom))] max-h-[calc(100dvh-8.25rem-env(safe-area-inset-bottom))] md:mb-0 md:max-h-[92vh]"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orders-filter-customer">Customer</Label>
              {picked ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{picked.name}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="orders-filter-customer"
                    value={query}
                    placeholder="Search customers…"
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query.trim() ? (
                    <ul className="max-h-48 overflow-auto rounded-lg border border-border">
                      {loading ? (
                        <li className="px-3 py-4 text-center text-sm text-muted-foreground">Searching…</li>
                      ) : results.length === 0 ? (
                        <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No matching customers.
                        </li>
                      ) : (
                        results.map((hit) => (
                          <li key={hit.id} className="border-b border-border last:border-0">
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                              onClick={() => setPicked({ id: hit.id, name: hit.name })}
                            >
                              <span className="font-medium">{hit.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {[hit.phone, hit.email].filter(Boolean).join(" · ") || "No contact yet"}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orders-filter-code">Order code</Label>
              <Input
                id="orders-filter-code"
                value={codeDraft}
                placeholder="ORD-…"
                autoComplete="off"
                onChange={(e) => setCodeDraft(e.target.value.slice(0, MAX_SEARCH))}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={apply} disabled={pending}>
                {pending ? "Applying…" : "Apply"}
              </Button>
              <Button type="button" variant="ghost" onClick={clearAll} disabled={pending}>
                Clear
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
