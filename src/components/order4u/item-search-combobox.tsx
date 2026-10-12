"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { fmtThb } from "@/lib/format-money";
import type { CatalogItem } from "@/lib/types";
import { searchCatalogItemsAction } from "@/server/actions/catalog";
import { cn } from "@/lib/utils";

type ItemSearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: CatalogItem) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

export function ItemSearchCombobox({
  value,
  onChange,
  onSelect,
  label = "Item name / variant",
  placeholder = "Type name or pick from catalog…",
  required = false,
}: ItemSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      searchCatalogItemsAction(value)
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

  function pick(item: CatalogItem) {
    onSelect(item);
    setOpen(false);
  }

  function addNewItem() {
    const name = value.trim();
    if (!name) return;
    onChange(name);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
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
                        onClick={addNewItem}
                      >
                        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                          Add new item: <span className="font-normal text-muted-foreground">&quot;{value.trim()}&quot;</span>
                        </span>
                      </button>
                      <p className="px-3 pb-2 text-xs text-muted-foreground">
                        Fill URL and price below. Saved to catalog when the order is created.
                      </p>
                    </>
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Type to search saved catalog items.
                    </p>
                  )}
                </li>
              ) : (
                results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium tabular-nums">{fmtThb(item.price)}</span>
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

export function CatalogItemBadge({
  catalogItemId,
  className,
}: {
  catalogItemId?: string;
  className?: string;
}) {
  if (!catalogItemId) return null;
  return (
    <span className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", className)}>
      From catalog
    </span>
  );
}
