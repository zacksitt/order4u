import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { StaffSerwistProvider } from "@/components/serwist-provider";
import { requestHostname, shouldExposeStaffPwaMetadata } from "@/lib/pwa-eligible";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "Order4U Staff";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const hostname = requestHostname(h.get("x-forwarded-host"), h.get("host"));
  const exposePwa = shouldExposeStaffPwaMetadata(hostname);

  return {
    applicationName: exposePwa ? APP_NAME : undefined,
    title: {
      default: "Order4U — Buying agent & cargo",
      template: "%s · Order4U",
    },
    description: "Staff dashboard for Thailand → Myanmar buying agents and cargo partners.",
    manifest: exposePwa ? "/manifest.webmanifest" : undefined,
    appleWebApp: exposePwa
      ? {
          capable: true,
          statusBarStyle: "default",
          title: APP_NAME,
        }
      : undefined,
    formatDetection: {
      telephone: false,
    },
    icons: {
      apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StaffSerwistProvider>{children}</StaffSerwistProvider>
      </body>
    </html>
  );
}
