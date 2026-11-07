import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.CUSTOMER_PII_KEY?.trim();
  if (!raw) {
    throw new Error("CUSTOMER_PII_KEY is not set. Add a 32-byte key (openssl rand -base64 32).");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CUSTOMER_PII_KEY must be 32 bytes as base64.");
  }
  return key;
}

export function isEncryptedPii(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptPii(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  if (isEncryptedPii(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptPii(value: string | null | undefined): string {
  if (!value) return "";
  if (!isEncryptedPii(value)) return value;
  const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function hashPii(value: string): string {
  return createHmac("sha256", getKey()).update(value).digest("hex");
}

export function phoneHashFromPlain(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return hashPii(digits || phone.trim() || "—");
}

export function emailHashFromPlain(email: string): string {
  const normalized = email.trim().toLowerCase();
  return normalized ? hashPii(normalized) : "";
}

export function customerPiiWrite(input: {
  phone?: string;
  email?: string | null;
  facebookProfileUrl?: string | null;
  notes?: string | null;
  messengerPsid?: string | null;
}) {
  const phone = input.phone?.trim() || "—";
  const psid = input.messengerPsid?.trim() || "";
  return {
    phone: encryptPii(phone) ?? encryptPii("—")!,
    phoneHash: phoneHashFromPlain(phone),
    email: encryptPii(input.email?.trim() || ""),
    emailHash: emailHashFromPlain(input.email ?? ""),
    facebookProfileUrl: encryptPii(input.facebookProfileUrl?.trim() || ""),
    notes: encryptPii(input.notes?.trim() || ""),
    messengerPsid: encryptPii(psid),
    messengerPsidHash: psid ? hashPii(psid) : null,
  };
}

export function customerPiiRead(row: {
  phone: string;
  email?: string | null;
  facebookProfileUrl?: string | null;
  notes?: string | null;
  messengerPsid?: string | null;
}) {
  const phone = decryptPii(row.phone);
  return {
    phone: phone || "—",
    email: decryptPii(row.email) || "",
    facebookProfileUrl: decryptPii(row.facebookProfileUrl) || "",
    notes: decryptPii(row.notes) || "",
    messengerPsid: decryptPii(row.messengerPsid) || "",
  };
}
