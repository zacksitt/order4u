import { randomBytes } from "crypto";

export function generateOrderCode(): string {
  return `ORD-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generatePublicAccessToken(): string {
  return randomBytes(18).toString("base64url");
}

export function generatePortalAccessToken(): string {
  return randomBytes(18).toString("base64url");
}
