import { listingTitleFromHtml } from "./listing-html";

const SHOPEE_PRICE_SUBUNITS = 100_000;

export function isShopeeShortUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "shp.ee" || host.endsWith(".shp.ee"));
  } catch {
    return false;
  }
}

export function isShopeeVideoUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "sv.shopee.co.th" &&
      url.pathname.startsWith("/share-video/")
    );
  } catch {
    return false;
  }
}

/** Destination embedded in a th.shp.ee landing page (`httpUrl:"..."`). */
export function destinationFromShortHtml(html: string): string | null {
  const match = html.match(/httpUrl:"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) return null;
  try {
    const destination = JSON.parse(`"${match[1]}"`) as unknown;
    return typeof destination === "string" && destination.startsWith("https://") ? destination : null;
  } catch {
    return null;
  }
}

export function shopeeVideoCaptionFromHtml(html: string): string | null {
  const match = html.match(/<script[^>]*>(\{"props":[\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]) as {
      props?: { pageProps?: { mediaInfo?: { video?: { caption?: unknown } } } };
    };
    const caption = data.props?.pageProps?.mediaInfo?.video?.caption;
    if (typeof caption !== "string") return null;
    const title = caption.replaceAll("\uFFFC", " ").replaceAll("#", " ").replace(/\s+/g, " ").trim();
    return title || null;
  } catch {
    return null;
  }
}

export function parseShopeeUrl(raw: string): { shopId: string; itemId: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "shopee.co.th" && host !== "www.shopee.co.th") return null;

  const product = url.pathname.match(/^\/product\/(\d+)\/(\d+)\/?$/);
  if (product?.[1] && product[2]) return { shopId: product[1], itemId: product[2] };

  const inline = url.pathname.match(/-i\.(\d+)\.(\d+)\/?$/);
  if (inline?.[1] && inline[2]) return { shopId: inline[1], itemId: inline[2] };

  return null;
}

/** Shopee item prices are integers in 1/100000 of the currency unit. */
export function shopeePriceToThb(raw: number): number {
  return Math.round(raw / (SHOPEE_PRICE_SUBUNITS / 100)) / 100;
}

/** Title from a Shopee link-preview HTML page. Strips the site suffix. */
export function shopeeTitleFromHtml(html: string): string | null {
  return listingTitleFromHtml(html);
}
