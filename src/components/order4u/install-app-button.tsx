"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
    if (standalone) setInstalled(true);
    setIos(/iPhone|iPad|iPod/i.test(nav.userAgent) && !("MSStream" in window));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function download() {
    setHint(null);
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
      return;
    }
    if (ios) {
      setHint("On iPhone: tap Share, then Add to Home Screen.");
      return;
    }
    setHint("Use your browser menu to install this app.");
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void download()}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Download className="h-4 w-4" />
        Download app
      </button>
      {hint && <span className="max-w-[14rem] px-3 text-xs text-muted-foreground">{hint}</span>}
    </span>
  );
}
