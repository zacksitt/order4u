"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* use fallback */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].replace(/"/g, "");
  return fallback;
}

type PdfDownloadButtonProps = {
  href: string;
  fallbackFilename: string;
  label?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  showIcon?: boolean;
};

/** Fetch PDF as blob — avoids mobile/PWA navigating away on `target=_blank` to the raw PDF URL. */
export function PdfDownloadButton({
  href,
  fallbackFilename,
  label = "Download PDF",
  className,
  size = "sm",
  variant = "outline",
  showIcon = true,
}: PdfDownloadButtonProps) {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackFilename);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      window.location.assign(href);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("w-full sm:w-auto", className)}
      disabled={pending}
      onClick={() => void download()}
    >
      {showIcon && <Download className="mr-2 h-4 w-4" />}
      {pending ? "Preparing…" : label}
    </Button>
  );
}
