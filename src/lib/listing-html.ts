function decodeBasicEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/** Product name from og:title or <title>, without the Shopee or Lazada suffix. */
export function listingTitleFromHtml(html: string): string | null {
  const og =
    html.match(/property="og:title"\s+content="([^"]+)"/i) ??
    html.match(/content="([^"]+)"\s+property="og:title"/i);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const raw = og?.[1] ?? titleTag?.[1];
  if (!raw) return null;
  const title = decodeBasicEntities(raw)
    .replace(/\s*\|\s*Shopee Thailand\s*$/i, "")
    .replace(/\s*\|\s*Lazada(?: Thailand)?\s*$/i, "")
    .trim();
  return title || null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** THB amount from a meta tag, JSON-LD offer, or Lazada `pdt_price` string. */
export function parseListingPrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return roundMoney(raw);
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return roundMoney(value);
}

function metaPrice(html: string): number | null {
  const match =
    html.match(/property="product:price:amount"\s+content="([^"]+)"/i) ??
    html.match(/content="([^"]+)"\s+property="product:price:amount"/i) ??
    html.match(/property="og:price:amount"\s+content="([^"]+)"/i) ??
    html.match(/content="([^"]+)"\s+property="og:price:amount"/i);
  return parseListingPrice(match?.[1]);
}

function priceFromNode(node: unknown): number | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const price = priceFromNode(item);
      if (price != null) return price;
    }
    return null;
  }
  const record = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice"]) {
    const parsed = parseListingPrice(record[key]);
    if (parsed != null) return parsed;
  }
  return record.offers ? priceFromNode(record.offers) : null;
}

function jsonLdPrice(html: string): number | null {
  const blocks = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const price = priceFromNode(JSON.parse(block[1] ?? ""));
      if (price != null) return price;
    } catch {
      continue;
    }
  }
  return null;
}

function pdtPrice(html: string): number | null {
  const escaped = html.match(/pdt_price\\":\\"([^"\\]+)/);
  const plain = html.match(/pdt_price":"([^"]+)"/);
  return parseListingPrice(escaped?.[1] ?? plain?.[1]);
}

export function listingPriceFromHtml(html: string): number | null {
  return metaPrice(html) ?? jsonLdPrice(html) ?? pdtPrice(html);
}
