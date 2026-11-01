"use client";

import { Download, Share2 } from "lucide-react";
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

type PdfActionButtonProps = {
  href: string;
  fallbackFilename: string;
  label?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  showIcon?: boolean;
};

async function fetchInvoiceFile(href: string, fallbackFilename: string): Promise<File> {
  const res = await fetch(href, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackFilename);
  return new File([blob], filename, { type: "application/pdf" });
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Fetch PDF as blob — avoids mobile/PWA navigating away on `target=_blank` to the raw PDF URL. */
export function PdfDownloadButton({
  href,
  fallbackFilename,
  label = "Download PDF",
  className,
  size = "sm",
  variant = "outline",
  showIcon = true,
}: PdfActionButtonProps) {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      saveFile(await fetchInvoiceFile(href, fallbackFilename));
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

export function PdfShareButton({
  href,
  fallbackFilename,
  label = "Share invoice",
  className,
  size = "sm",
  variant = "outline",
  showIcon = true,
}: PdfActionButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    setPending(true);
    try {
      const file = await fetchInvoiceFile(href, fallbackFilename);
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        setError("Sharing isn’t available in this browser.");
        return;
      }
      await navigator.share({ files: [file], title: file.name });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Couldn’t share the invoice.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("w-full sm:w-auto", className)}
        disabled={pending}
        onClick={() => void share()}
      >
        {showIcon && <Share2 className="mr-2 h-4 w-4" />}
        {pending ? "Preparing…" : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
