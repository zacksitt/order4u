import { MAX_SEARCH, zCatalogQuery } from "@/lib/input-rules";
import type { CatalogItem } from "@/lib/types";
import { requireAgent } from "@/server/auth/session";
import { prisma } from "@/server/db";

function mapCatalogItem(row: {
  id: string;
  name: string;
  sourceUrl: string | null;
  price: { toString(): string };
  description: string | null;
}): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    url: row.sourceUrl ?? "",
    price: Number(row.price),
    description: row.description ?? undefined,
  };
}

export async function searchCatalogItems(query: string): Promise<CatalogItem[]> {
  const session = await requireAgent();
  const q = zCatalogQuery.safeParse(typeof query === "string" ? query.slice(0, MAX_SEARCH) : "").data ?? "";
  const rows = await prisma.catalogItem.findMany({
    where: {
      tenantId: session.tenantId,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
  });
  return rows.map(mapCatalogItem);
}
