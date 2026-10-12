import { staffPwaManifest } from "@/lib/pwa-manifest";

export const dynamic = "force-static";

export function GET() {
  return Response.json(staffPwaManifest(), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
