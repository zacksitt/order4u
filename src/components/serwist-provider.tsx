"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, useState } from "react";

import { shouldEnableStaffPwa } from "@/lib/pwa-eligible";

type Props = {
  children: React.ReactNode;
};

/** Registers the service worker in production on eligible browsers/hosts only. */
export function StaffSerwistProvider({ children }: Props) {
  const [disable, setDisable] = useState(true);

  useEffect(() => {
    const off =
      process.env.NODE_ENV === "development" ||
      !shouldEnableStaffPwa(window.location.hostname, navigator.userAgent);
    setDisable(off);
  }, []);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={disable} cacheOnNavigation={false}>
      {children}
    </SerwistProvider>
  );
}
