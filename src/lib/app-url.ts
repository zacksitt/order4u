/** Public site base URL for customer links (Messenger, copy to chat). No trailing slash. */
export function getPublicAppUrl(): string {
  const raw = process.env.APP_URL ?? process.env.AUTH_URL ?? "";
  return raw.replace(/\/$/, "");
}

export function absolutePublicUrl(path: string): string {
  const base = getPublicAppUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
