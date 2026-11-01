export function isLazadaShortUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" && url.hostname.toLowerCase() === "s.lazada.co.th";
  } catch {
    return false;
  }
}

export function parseLazadaUrl(raw: string): { itemId: string; canonicalUrl: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "lazada.co.th" && host !== "www.lazada.co.th" && host !== "pages.lazada.co.th") {
    return null;
  }

  const product = url.pathname.match(/^\/products\/(.+-i(\d+)(?:-s\d+)?)(?:\.html)?\/?$/);
  const slug = product?.[1];
  const itemId = product?.[2];
  if (!slug || !itemId) return null;
  const file = slug.endsWith(".html") ? slug : `${slug}.html`;
  return {
    itemId,
    canonicalUrl: `https://www.lazada.co.th/products/${file}`,
  };
}

/** First Lazada product URL embedded in a short-link landing page. */
export function lazadaProductUrlFromHtml(html: string): string | null {
  const match = html.match(
    /https:\/\/(?:www\.)?lazada\.co\.th\/products\/[^"'\\\s<>]+-i\d+(?:-s\d+)?(?:\.html)?/,
  );
  if (!match?.[0]) return null;
  return parseLazadaUrl(match[0])?.canonicalUrl ?? null;
}
