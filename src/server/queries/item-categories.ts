import type { ItemCategory } from "@/lib/types";
import { requireCargo } from "@/server/auth/session";
import { prisma } from "@/server/db";

export async function listItemCategories(): Promise<ItemCategory[]> {
  const session = await requireCargo();
  const rows = await prisma.itemCategory.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cargoPriceThb: Number(row.cargoPriceThb),
  }));
}
