const TUNNEL_HOST_RE = /(?:^|\.)ngrok-free\.app$|(?:^|\.)ngrok\.io$|(?:^|\.)ngrok\.app$/i;

/** ngrok free interstitial returns HTML for manifest/SW — skip install prompts on tunnels unless forced. */
export function isTunnelHost(hostname: string): boolean {
  return TUNNEL_HOST_RE.test(hostname);
}

export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Messenger|Twitter/i.test(userAgent);
}

/** Set NEXT_PUBLIC_PWA=1 at build time to allow PWA on ngrok (paid / no interstitial). */
export function pwaAllowedOnTunnel(): boolean {
  return process.env.NEXT_PUBLIC_PWA === "1";
}

export function shouldEnableStaffPwa(hostname: string, userAgent: string): boolean {
  if (typeof window !== "undefined" && !window.isSecureContext) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (isInAppBrowser(userAgent)) return false;
  if (isTunnelHost(hostname) && !pwaAllowedOnTunnel()) return false;
  return true;
}

export function shouldExposeStaffPwaMetadata(hostname: string): boolean {
  if (isTunnelHost(hostname) && !pwaAllowedOnTunnel()) return false;
  return true;
}

export function requestHostname(forwardedHost: string | null, host: string | null): string {
  const raw = forwardedHost ?? host ?? "";
  return raw.split(",")[0]?.trim().split(":")[0] ?? "";
}
