"use server";

import { isLazadaShortUrl, lazadaProductUrlFromHtml, parseLazadaUrl } from "@/lib/lazada";
import { listingPriceFromHtml, listingTitleFromHtml } from "@/lib/listing-html";
import {
  destinationFromShortHtml,
  isShopeeShortUrl,
  isShopeeVideoUrl,
  parseShopeeUrl,
  shopeePriceToThb,
  shopeeVideoCaptionFromHtml,
} from "@/lib/shopee";
import { requireAgent } from "@/server/auth/session";

const LOOKUP_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SHARE_USER_AGENT = "WhatsApp/2.23.20.0";

export type ShopeeLookupResult =
  | {
      ok: true;
      title: string;
      priceThb: number | null;
      shopId: string | null;
      itemId: string | null;
      canonicalUrl: string | null;
      source: "product" | "video";
    }
  | { ok: false; error: string };

const SHOPEE_LOOKUP_FAILED = "Shopee did not return this product. Enter the title and price yourself.";
const LAZADA_LOOKUP_FAILED = "Lazada did not return this product. Enter the title and price yourself.";
const UNSUPPORTED_LINK = "Paste a Shopee or Lazada product link.";

async function resolveShopeeTarget(raw: string): Promise<string> {
  if (!isShopeeShortUrl(raw)) return raw;

  const headers = { Accept: "text/html", "User-Agent": USER_AGENT };
  const manual = await fetch(raw, {
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  const location = manual.headers.get("location");
  if (location) {
    const absolute = new URL(location, raw).href;
    if (parseShopeeUrl(absolute) || isShopeeVideoUrl(absolute)) return absolute;
  }

  const followed = await fetch(raw, {
    redirect: "follow",
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  if (parseShopeeUrl(followed.url) || isShopeeVideoUrl(followed.url)) return followed.url;

  const html = await followed.text();
  return destinationFromShortHtml(html) ?? (location ? new URL(location, raw).href : raw);
}

export async function lookupProductUrl(url: string): Promise<ShopeeLookupResult> {
  const raw = url.trim();
  if (parseLazadaUrl(raw) || isLazadaShortUrl(raw)) return lookupLazadaProduct(raw);
  if (parseShopeeUrl(raw) || isShopeeShortUrl(raw) || isShopeeVideoUrl(raw)) {
    return lookupShopeeProduct(raw);
  }
  await requireAgent();
  return { ok: false, error: UNSUPPORTED_LINK };
}

export async function lookupShopeeProduct(url: string): Promise<ShopeeLookupResult> {
  await requireAgent();
  let target = url.trim();
  try {
    target = await resolveShopeeTarget(target);
  } catch {
    return { ok: false, error: "Could not open this Shopee short link." };
  }

  if (isShopeeVideoUrl(target)) {
    return lookupShopeeVideo(target);
  }

  const parsed = parseShopeeUrl(target);
  if (!parsed) {
    return {
      ok: false,
      error: isShopeeShortUrl(url)
        ? "This short link did not open a Shopee product."
        : "Paste a shopee.co.th product link or a th.shp.ee short link.",
    };
  }

  const endpoint = new URL("https://shopee.co.th/api/v4/item/get");
  endpoint.searchParams.set("itemid", parsed.itemId);
  endpoint.searchParams.set("shopid", parsed.shopId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        Referer: `https://shopee.co.th/product/${parsed.shopId}/${parsed.itemId}`,
      },
      cache: "no-store",
    });
    if (response.ok) {
      const body = (await response.json()) as {
        error?: number | null;
        data?: { name?: unknown; price?: unknown; item?: { name?: unknown; price?: unknown } };
      };
      const item = typeof body.data?.name === "string" ? body.data : body.data?.item;
      const title = typeof item?.name === "string" ? item.name.trim() : "";
      const rawPrice = item?.price;
      const apiFailed = body.error != null && body.error !== 0;
      if (!apiFailed && title && typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
        return {
          ok: true,
          title,
          priceThb: shopeePriceToThb(rawPrice),
          shopId: parsed.shopId,
          itemId: parsed.itemId,
          canonicalUrl: `https://shopee.co.th/product/${parsed.shopId}/${parsed.itemId}`,
          source: "product",
        };
      }
    }

    const share = await lookupSharePreview(parsed.shopId, parsed.itemId);
    if (!share) return { ok: false, error: SHOPEE_LOOKUP_FAILED };
    return {
      ok: true,
      title: share.title,
      priceThb: share.priceThb,
      shopId: parsed.shopId,
      itemId: parsed.itemId,
      canonicalUrl: `https://shopee.co.th/product/${parsed.shopId}/${parsed.itemId}`,
      source: "product",
    };
  } catch {
    return { ok: false, error: "Could not reach Shopee. Enter the title and price yourself." };
  } finally {
    clearTimeout(timer);
  }
}

async function lookupShopeeVideo(pageUrl: string): Promise<ShopeeLookupResult> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": USER_AGENT,
        "Accept-Language": "th,en;q=0.8",
      },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: SHOPEE_LOOKUP_FAILED };
    const html = await response.text();
    const title = shopeeVideoCaptionFromHtml(html);
    if (!title) return { ok: false, error: SHOPEE_LOOKUP_FAILED };
    return {
      ok: true,
      title,
      priceThb: listingPriceFromHtml(html),
      shopId: null,
      itemId: null,
      canonicalUrl: null,
      source: "video",
    };
  } catch {
    return { ok: false, error: "Could not reach Shopee. Enter the title and price yourself." };
  }
}

async function lookupSharePreview(
  shopId: string,
  itemId: string,
): Promise<{ title: string; priceThb: number | null } | null> {
  const response = await fetch(`https://shopee.co.th/product/${shopId}/${itemId}`, {
    headers: {
      Accept: "text/html",
      "User-Agent": SHARE_USER_AGENT,
      "Accept-Language": "th,en;q=0.8",
    },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const html = await response.text();
  const title = listingTitleFromHtml(html);
  if (!title) return null;
  return { title, priceThb: listingPriceFromHtml(html) };
}

async function resolveLazadaTarget(raw: string): Promise<string> {
  if (!isLazadaShortUrl(raw)) return raw;

  const headers = { Accept: "text/html", "User-Agent": USER_AGENT };
  const manual = await fetch(raw, {
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  const location = manual.headers.get("location");
  if (location) {
    const absolute = new URL(location, raw).href;
    if (parseLazadaUrl(absolute)) return absolute;
  }

  const followed = await fetch(raw, {
    redirect: "follow",
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  if (parseLazadaUrl(followed.url)) return followed.url;

  const html = await followed.text();
  return lazadaProductUrlFromHtml(html) ?? (location ? new URL(location, raw).href : raw);
}

async function lookupLazadaProduct(url: string): Promise<ShopeeLookupResult> {
  await requireAgent();
  let target = url.trim();
  try {
    target = await resolveLazadaTarget(target);
  } catch {
    return { ok: false, error: "Could not open this Lazada short link." };
  }

  const parsed = parseLazadaUrl(target);
  if (!parsed) {
    return {
      ok: false,
      error: isLazadaShortUrl(url)
        ? "This short link did not open a Lazada product."
        : UNSUPPORTED_LINK,
    };
  }

  try {
    const response = await fetch(parsed.canonicalUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": SHARE_USER_AGENT,
        "Accept-Language": "th,en;q=0.8",
      },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: LAZADA_LOOKUP_FAILED };
    const html = await response.text();
    const title = listingTitleFromHtml(html);
    if (!title) return { ok: false, error: LAZADA_LOOKUP_FAILED };
    return {
      ok: true,
      title,
      priceThb: listingPriceFromHtml(html),
      shopId: null,
      itemId: null,
      canonicalUrl: parsed.canonicalUrl,
      source: "product",
    };
  } catch {
    return { ok: false, error: "Could not reach Lazada. Enter the title and price yourself." };
  }
}
