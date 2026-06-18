"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  PWA_EVENTS,
  isStandalonePwa,
  openPwaInstall,
  type PwaInstallState,
} from "@/lib/pwa/install";

export function PwaInstallMenuItem({ onOpen }: { onOpen?: () => void }) {
  const [state, setState] = useState<PwaInstallState>("unavailable");

  useEffect(() => {
    if (isStandalonePwa()) {
      setState("installed");
      return;
    }
    if (window.__prodmatchInstallPrompt) setState("available");

    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: PwaInstallState }>).detail;
      if (detail?.state) setState(detail.state);
    };
    window.addEventListener(PWA_EVENTS.state, handleState);
    return () => window.removeEventListener(PWA_EVENTS.state, handleState);
  }, []);

  if (state === "installed" || state === "unavailable") return null;

  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openPwaInstall();
      }}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} />
      Install app
    </button>
  );
}
