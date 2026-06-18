"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __prodmatchInstallPrompt?: BeforeInstallPromptEvent;
  }
}

// Registers the service worker (public/sw.js) and drives a *controlled* update
// flow: when a new SW finishes installing while an old one still controls the
// page, we surface a sonner toast instead of silently hot-swapping assets. The
// user taps "Refresh" → we tell the waiting worker to SKIP_WAITING → the
// `controllerchange` event fires → we reload once with the new version live.
//
// Registration is production-only: in dev, Turbopack HMR and a cache-first SW
// fight each other. Returns null — purely a side-effect mount.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__prodmatchInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent("prodmatch:install-available"));
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const promptUpdate = (worker: ServiceWorker) => {
      toast("Update available", {
        description: "A new version of ProdMatch.ai is ready.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => worker.postMessage("SKIP_WAITING"),
        },
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // A worker may already be waiting from a previous visit.
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `controller` is null on the very first install — only prompt when
            // we're replacing an already-active worker.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(installing);
            }
          });
        });
      } catch {
        /* registration failed — app still works, just no offline shell */
      }
    };

    // Defer registration until the page has settled to avoid contending with
    // the critical render path.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
