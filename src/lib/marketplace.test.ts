import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { marketplaceFromLine } from "./marketplace";

describe("marketplaceFromLine", () => {
  it("marks a Lazada product URL as lazada", () => {
    assert.deepEqual(
      marketplaceFromLine({ url: "https://www.lazada.co.th/products/marubi-i16276327715.html" }),
      { marketplace: "lazada" },
    );
  });

  it("leaves a Lazada short link unmarked until it is a product URL", () => {
    assert.deepEqual(marketplaceFromLine({ url: "https://s.lazada.co.th/s.Ab12" }), {});
  });

  it("uses the form source when the URL is not a product page yet", () => {
    assert.deepEqual(
      marketplaceFromLine({ url: "https://s.lazada.co.th/s.Ab12", marketplace: "lazada" }),
      { marketplace: "lazada" },
    );
  });

  it("marks Shopee only when the fetched ids match the URL", () => {
    const url = "https://shopee.co.th/product/12345/67890";
    assert.deepEqual(marketplaceFromLine({ url, shopeeShopId: "12345", shopeeItemId: "67890" }), {
      marketplace: "shopee",
      shopeeShopId: "12345",
      shopeeItemId: "67890",
    });
    assert.deepEqual(marketplaceFromLine({ url }), {});
  });
});
