import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decryptPii, emailHashFromPlain, encryptPii, isEncryptedPii, phoneHashFromPlain } from "./customer-pii";

process.env.CUSTOMER_PII_KEY ??= "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";

describe("customer PII", () => {
  it("round-trips AES-GCM ciphertext", () => {
    const cipher = encryptPii("09123456789");
    assert.ok(cipher && isEncryptedPii(cipher));
    assert.equal(decryptPii(cipher), "09123456789");
  });

  it("leaves plaintext readable until migrated", () => {
    assert.equal(decryptPii("09123456789"), "09123456789");
  });

  it("hashes normalized phone digits", () => {
    assert.equal(phoneHashFromPlain("+66 91-234"), phoneHashFromPlain("6691234"));
  });

  it("hashes emails in lowercase", () => {
    assert.equal(emailHashFromPlain("A@Shop.com"), emailHashFromPlain("a@shop.com"));
  });
});
