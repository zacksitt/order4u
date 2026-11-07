import { parseLazadaUrl } from "./lazada";
import { parseShopeeUrl } from "./shopee";

export function marketplaceFromLine(line: {
  url: string;
  marketplace?: "shopee" | "lazada" | "other";
  shopeeShopId?: string;
  shopeeItemId?: string;
}): { marketplace: "shopee"; shopeeShopId: string; shopeeItemId: string } | { marketplace: "lazada" } | { marketplace: "other" } | Record<string, never> {
  const shopee = parseShopeeUrl(line.url);
  if (shopee && line.shopeeShopId === shopee.shopId && line.shopeeItemId === shopee.itemId) {
    return {
      marketplace: "shopee",
      shopeeShopId: shopee.shopId,
      shopeeItemId: shopee.itemId,
    };
  }
  if (parseLazadaUrl(line.url)) return { marketplace: "lazada" };
  if (line.marketplace === "shopee" && shopee) {
    return {
      marketplace: "shopee",
      shopeeShopId: shopee.shopId,
      shopeeItemId: shopee.itemId,
    };
  }
  if (line.marketplace === "lazada") return { marketplace: "lazada" };
  if (line.marketplace === "shopee") return { marketplace: "other" };
  if (line.marketplace === "other") return { marketplace: "other" };
  return {};
}
