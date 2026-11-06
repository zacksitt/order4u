import type { ItemCategory, OrderItem } from "@/lib/types";

export type CargoCategoryLine = {
  categoryId: string;
  categoryName: string;
  qty: number;
  weightKg: number;
  /** THB per kg. */
  unitPriceThb: number;
  totalThb: number;
};

export function roundThb(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Groups order lines by category (qty summed). Each line is charged weight × price per kg.
 * `priceByCategoryId` overrides the category's default price for this order only.
 * Cancelled items are skipped.
 */
export function cargoCategoryLines(
  items: Pick<OrderItem, "id" | "qty" | "status">[],
  categories: Pick<ItemCategory, "id" | "name" | "cargoPriceThb">[],
  selectedByItemId: Record<string, string>,
  weightByCategoryId: Record<string, number> = {},
  priceByCategoryId: Record<string, number> = {},
): { lines: CargoCategoryLine[]; subtotal: number; totalWeightKg: number; missing: number } {
  const byId = new Map<string, CargoCategoryLine>();
  let missing = 0;
  for (const item of items) {
    if (item.status === "cancelled") continue;
    const category = categories.find((row) => row.id === (selectedByItemId[item.id] ?? ""));
    if (!category) {
      missing += 1;
      continue;
    }
    const line = byId.get(category.id) ?? {
      categoryId: category.id,
      categoryName: category.name,
      qty: 0,
      weightKg: weightByCategoryId[category.id] ?? 0,
      unitPriceThb: priceByCategoryId[category.id] ?? category.cargoPriceThb,
      totalThb: 0,
    };
    line.qty += item.qty;
    line.totalThb = roundThb(line.weightKg * line.unitPriceThb);
    byId.set(category.id, line);
  }
  const lines = [...byId.values()];
  const subtotal = roundThb(lines.reduce((sum, line) => sum + line.totalThb, 0));
  const totalWeightKg = Math.round(lines.reduce((sum, line) => sum + line.weightKg, 0) * 100) / 100;
  return { lines, subtotal, totalWeightKg, missing };
}
