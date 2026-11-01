import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLazadaShortUrl, lazadaProductUrlFromHtml, parseLazadaUrl } from "./lazada";
import { listingPriceFromHtml, listingTitleFromHtml } from "./listing-html";

describe("parseLazadaUrl", () => {
  it("reads the item id and a canonical product URL", () => {
    assert.deepEqual(parseLazadaUrl("https://www.lazada.co.th/products/marubi-i16276327715.html?spm=1"), {
      itemId: "16276327715",
      canonicalUrl: "https://www.lazada.co.th/products/marubi-i16276327715.html",
    });
  });

  it("reads an item id that includes a sku", () => {
    assert.equal(
      parseLazadaUrl("https://lazada.co.th/products/cube-i99-s88.html")?.itemId,
      "99",
    );
  });

  it("rejects Shopee links and non-product Lazada paths", () => {
    assert.equal(parseLazadaUrl("https://shopee.co.th/product/12345/67890"), null);
    assert.equal(parseLazadaUrl("https://lazada.co.th/product/12345/67890"), null);
    assert.equal(parseLazadaUrl("http://www.lazada.co.th/products/cube-i99.html"), null);
  });

  it("recognizes s.lazada.co.th short links", () => {
    assert.equal(isLazadaShortUrl("https://s.lazada.co.th/s.Ab12"), true);
    assert.equal(isLazadaShortUrl("https://www.lazada.co.th/products/cube-i99.html"), false);
    const html = 'go to https://www.lazada.co.th/products/cube-i99.html now';
    assert.equal(
      lazadaProductUrlFromHtml(html),
      "https://www.lazada.co.th/products/cube-i99.html",
    );
  });
});

describe("listing html", () => {
  it("reads a Lazada title and drops the site suffix", () => {
    const html = '<meta property="og:title" content="Marubi | eye patch | Lazada Thailand"/>';
    assert.equal(listingTitleFromHtml(html), "Marubi | eye patch");
  });

  it("reads a price from meta, JSON-LD, or pdt_price", () => {
    assert.equal(
      listingPriceFromHtml('<meta property="product:price:amount" content="890.50"/>'),
      890.5,
    );
    assert.equal(
      listingPriceFromHtml(
        '<script type="application/ld+json">{"@type":"Product","offers":{"price":"129.00","priceCurrency":"THB"}}</script>',
      ),
      129,
    );
    assert.equal(listingPriceFromHtml('{"pdt_price":"฿1,049.00"}'), 1049);
    assert.equal(listingPriceFromHtml(String.raw`{\"pdt_price\":\"฿1,049.00\"}`), 1049);
  });
});
