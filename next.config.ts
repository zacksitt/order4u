import path from "node:path";
import { fileURLToPath } from "node:url";

import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

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
  /** App lives in a subfolder (e.g. /root/app/order4u); avoid tracing parent lockfiles. */
  outputFileTracingRoot: appRoot,
  allowedDevOrigins: allowedDevOriginsFromEnv(),
  async rewrites() {
    return [{ source: "/sw.js", destination: "/serwist/sw.js" }];
  },
};

export default withSerwist(nextConfig);
