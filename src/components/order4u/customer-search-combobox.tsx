"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { MAX_NAME, MAX_SEARCH } from "@/lib/input-rules";
import type { CustomerSearchHit } from "@/server/queries/customers";
import { searchCustomersAction } from "@/server/actions/customers";

type CustomerSearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerSearchHit) => void;
  onAddNew: (name: string) => void;
};

export function CustomerSearchCombobox({
  value,
  onChange,
  onSelect,
  onAddNew,
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CustomerSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      searchCustomersAction(value.slice(0, MAX_SEARCH))
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
  }, [value, open]);

  function pick(customer: CustomerSearchHit) {
    onSelect(customer);
    setOpen(false);
  }

  function addNew() {
    const name = value.trim();
    if (!name) return;
    onAddNew(name);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor="customer-name" required>
        Name
      </FieldLabel>
      <div className="relative">
        <Input
          id="customer-name"
          value={value}
          placeholder="Type name or pick a customer…"
          onChange={(e) => {
            onChange(e.target.value.slice(0, MAX_NAME));
            setOpen(true);
          }}
          maxLength={MAX_NAME}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />

        {open && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card text-card-foreground shadow-md">
            <ul className="max-h-56 overflow-auto p-1" role="listbox">
              {loading ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</li>
              ) : results.length === 0 ? (
                <li className="p-1">
                  {value.trim() ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={addNew}
                      >
                        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                          Add new customer:{" "}
                          <span className="font-normal text-muted-foreground">&quot;{value.trim()}&quot;</span>
                        </span>
                      </button>
                      <p className="px-3 pb-2 text-xs text-muted-foreground">
                        Fill phone below if you have it. Login email and password are set on Customers.
                      </p>
                    </>
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Type to search customers.
                    </p>
                  )}
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
        )}
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default"
          aria-label="Close search"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
