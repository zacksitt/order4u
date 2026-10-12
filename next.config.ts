import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

/** Allow ngrok / tunnel host for HMR when testing Messenger webviews in dev (see APP_URL). */
function allowedDevOriginsFromEnv(): string[] {
  const hosts = new Set<string>();
  for (const key of ["APP_URL", "AUTH_URL"] as const) {
    const raw = process.env[key];
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* ignore invalid URL */
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOriginsFromEnv(),
  async rewrites() {
    return [{ source: "/sw.js", destination: "/serwist/sw.js" }];
  },
};

export default withSerwist(nextConfig);
