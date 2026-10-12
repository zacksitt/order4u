import type { MetadataRoute } from "next";

/** Relative URLs only — works on any HTTPS host. */
export function staffPwaManifest(): MetadataRoute.Manifest {
  return {
    id: "/login",
    name: "Order4U Staff",
    short_name: "Order4U",
    description: "Buying agent and cargo staff dashboard.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafb",
    theme_color: "#0d9488",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Agent orders",
        short_name: "Orders",
        url: "/agent/orders",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Cargo queue",
        short_name: "Cargo",
        url: "/cargo/queue",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
