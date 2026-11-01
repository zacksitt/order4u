import { parseLazadaUrl } from "./lazada";
import { parseShopeeUrl } from "./shopee";

export function marketplaceFromLine(line: {
  url: string;
  shopeeShopId?: string;
  shopeeItemId?: string;
}): { marketplace: "shopee"; shopeeShopId: string; shopeeItemId: string } | { marketplace: "lazada" } | Record<string, never> {
  const shopee = parseShopeeUrl(line.url);
  if (shopee && line.shopeeShopId === shopee.shopId && line.shopeeItemId === shopee.itemId) {
    return {
      marketplace: "shopee",
      shopeeShopId: shopee.shopId,
      shopeeItemId: shopee.itemId,
    };
  }
  if (parseLazadaUrl(line.url)) return { marketplace: "lazada" };
  return {};
}
