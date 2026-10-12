"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyLineButtonProps = {
  text: string;
  label?: string;
};

export function CopyLineButton({ text, label = "Copy link" }: CopyLineButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const toCopy =
      text.startsWith("http://") || text.startsWith("https://")
        ? text
        : `${window.location.origin}${text.startsWith("/") ? text : `/${text}`}`;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* wireframe: ignore */
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="w-full sm:w-auto">
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}
