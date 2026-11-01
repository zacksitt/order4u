"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ShareAppButton({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setNote(null);
    const href = url.startsWith("http")
      ? url
      : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Order4U", url: href });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(href);
      setNote("Link copied");
    } catch {
      setNote("Couldn’t copy the link.");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void share()}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Share2 className="h-4 w-4" />
        Share app
      </button>
      {note && <span className="px-3 text-xs text-muted-foreground">{note}</span>}
    </span>
  );
}
