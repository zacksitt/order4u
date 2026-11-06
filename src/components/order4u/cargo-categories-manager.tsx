"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtThb } from "@/lib/format-money";
import { MAX_NAME, firstIssueMessage, itemCategorySchema } from "@/lib/input-rules";
import type { ItemCategory } from "@/lib/types";
import {
  createItemCategory,
  deleteItemCategory,
  updateItemCategory,
} from "@/server/actions/cargo-categories";

export function CargoCategoriesManager({ categories }: { categories: ItemCategory[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-[14px] border border-border bg-card p-4 sm:grid-cols-[1fr_140px_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const checked = itemCategorySchema.safeParse({ name, cargoPriceThb: Number(price) });
          if (!checked.success) {
            setError(firstIssueMessage(checked.error, "Enter a name and a cargo price greater than 0."));
            return;
          }
          run(
            () => createItemCategory(checked.data),
            () => {
              setName("");
              setPrice("");
            },
          );
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="category-name">Category name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Clothes"
            required
            maxLength={MAX_NAME}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category-price">Cargo price (THB per kg)</Label>
          <Input
            id="category-price"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="150"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          Add category
        </Button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet. Add one to price cargo by item type.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              pending={pending}
              onSave={(next) => {
                const checked = itemCategorySchema.safeParse(next);
                if (!checked.success) {
                  setError(firstIssueMessage(checked.error, "Enter a name and a cargo price greater than 0."));
                  return;
                }
                run(() => updateItemCategory({ id: category.id, ...checked.data }));
              }}
              onDelete={() => {
                if (!window.confirm(`Delete the category “${category.name}”?`)) return;
                run(() => deleteItemCategory(category.id));
              }}
            />
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function CategoryRow({
  category,
  pending,
  onSave,
  onDelete,
}: {
  category: ItemCategory;
  pending: boolean;
  onSave: (next: { name: string; cargoPriceThb: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [price, setPrice] = useState(String(category.cargoPriceThb));
  const dirty = name.trim() !== category.name || Number(price) !== category.cargoPriceThb;

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1">
        <Label className="text-xs">Category name</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_NAME} />
      </div>
      <div className="w-full space-y-1 sm:w-36">
        <Label className="text-xs">Cargo price (THB per kg)</Label>
        <Input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
        <p className="text-xs text-muted-foreground">{fmtThb(category.cargoPriceThb)} per kg</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !dirty}
          onClick={() => onSave({ name, cargoPriceThb: Number(price) })}
        >
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
}
