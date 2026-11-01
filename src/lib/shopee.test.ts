import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  destinationFromShortHtml,
  isShopeeShortUrl,
  isShopeeVideoUrl,
  parseShopeeUrl,
  shopeePriceToThb,
  shopeeTitleFromHtml,
  shopeeVideoCaptionFromHtml,
} from "./shopee";

describe("parseShopeeUrl", () => {
  it("reads shop and item ids from a product path", () => {
    assert.deepEqual(parseShopeeUrl("https://shopee.co.th/product/12345/67890"), {
      shopId: "12345",
      itemId: "67890",
    });
  });

  it("reads ids from the -i.shop.item slug and ignores the query", () => {
    assert.deepEqual(
      parseShopeeUrl("https://www.shopee.co.th/Running-Shoes-i.111.222?sp_atk=abc"),
      { shopId: "111", itemId: "222" },
    );
  });

  it("reads ids from a long Thai slug with extraParams", () => {
    const url =
      "https://shopee.co.th/-spes-%E0%B8%AB%E0%B8%99%E0%B8%B1%E0%B8%87-Busy-Book-i.1362696453.47317961174?extraParams=%7B%22display_model_id%22%3A386518519233%7D";
    assert.deepEqual(parseShopeeUrl(url), {
      shopId: "1362696453",
      itemId: "47317961174",
    });
  });

  it("rejects other hosts and non-https links", () => {
    assert.equal(parseShopeeUrl("https://lazada.co.th/product/12345/67890"), null);
    assert.equal(parseShopeeUrl("https://shopee.com/product/12345/67890"), null);
    assert.equal(parseShopeeUrl("http://shopee.co.th/product/12345/67890"), null);
    assert.equal(parseShopeeUrl("not a url"), null);
  });
});

describe("short links", () => {
  it("recognizes th.shp.ee and not a product host", () => {
    assert.equal(isShopeeShortUrl("https://th.shp.ee/is9su979?fromSource=copy_link&smtt=0.0.9"), true);
    assert.equal(isShopeeShortUrl("https://shopee.co.th/product/1/2"), false);
    assert.equal(parseShopeeUrl("https://th.shp.ee/is9su979"), null);
  });

  it("reads the landing-page destination", () => {
    const html =
      'CONFIG={httpUrl:"https:\\/\\/shopee.co.th\\/Busy-Book-i.1362696453.47317961174?fromSource=copy_link"};';
    const destination = destinationFromShortHtml(html);
    assert.equal(
      destination,
      "https://shopee.co.th/Busy-Book-i.1362696453.47317961174?fromSource=copy_link",
    );
    assert.deepEqual(parseShopeeUrl(destination ?? ""), {
      shopId: "1362696453",
      itemId: "47317961174",
    });
  });

  it("treats sv.shopee.co.th/share-video as a video, not a product", () => {
    const video = "https://sv.shopee.co.th/share-video/EEbn_XWOCQBqhPJcAAAAAA==?pid=sv";
    assert.equal(isShopeeVideoUrl(video), true);
    assert.equal(parseShopeeUrl(video), null);
    const html =
      '<script>{"props":{"pageProps":{"mediaInfo":{"video":{"caption":"\\uFFFC #เทปนาโน #ลูกบอล"}}}}}</script>';
    assert.equal(shopeeVideoCaptionFromHtml(html), "เทปนาโน ลูกบอล");
  });
});

describe("shopeeTitleFromHtml", () => {
  it("reads og:title and drops the Shopee suffix", () => {
    const html =
      '<meta property="og:title" content="Busy Book | Shopee Thailand"/><title>ignored</title>';
    assert.equal(shopeeTitleFromHtml(html), "Busy Book");
  });
});

describe("shopeePriceToThb", () => {
  it("converts subunit prices to THB", () => {
    assert.equal(shopeePriceToThb(89_000_000), 890);
    assert.equal(shopeePriceToThb(89_050_000), 890.5);
  });
});
