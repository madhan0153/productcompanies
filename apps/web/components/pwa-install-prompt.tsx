"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

// Chrome / Edge / Samsung Internet on Android dispatch `beforeinstallprompt`
// when the manifest + service worker + engagement criteria are met. iOS
// Safari does NOT fire it — users have to "Add to Home Screen" manually.
//
// Dismissed state: 30-day cooldown via localStorage.
// Install tracking: fires window.clarity("set") + marks localStorage so we
// never re-prompt a user who already installed.

const DISMISSED_KEY = "prodmatch.pwa.install.dismissed_until";
const COOLDOWN_MS   = 30 * 24 * 3_600_000;

const FIRST_VISIT_KEY      = "prodmatch.pwa.first_visit_at";
const FIRST_VISIT_GRACE_MS = 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function trackClarity(key: string, value: string) {
  try {
    const w = window as any;
    if (typeof w.clarity === "function") w.clarity("set", key, value);
  } catch { /* ignore */ }
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as installed PWA — no need to prompt
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (inStandalone) return;

    const dismissedUntil = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() < dismissedUntil) return;

    let firstVisitAt = Number(localStorage.getItem(FIRST_VISIT_KEY) ?? 0);
    if (!firstVisitAt) {
      firstVisitAt = Date.now();
      try { localStorage.setItem(FIRST_VISIT_KEY, String(firstVisitAt)); } catch { /* quota */ }
    }
    if (Date.now() - firstVisitAt < FIRST_VISIT_GRACE_MS) return;

    setDismissed(false);

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (isIos) setIosVisible(true);
  }, []);

  // Android/Desktop install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Native install confirmed — track + close prompt for this session.
  // We don't set a permanent localStorage flag so if the user later
  // uninstalls, the prompt will resurface after the normal cooldown.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      trackClarity("pwa_install", "true");
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS));
    } catch { /* quota */ }
    trackClarity("pwa_dismiss", "true");
    setDeferred(null);
    setIosVisible(false);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      // appinstalled event will fire and handle the tracking
      setDeferred(null);
      setDismissed(true);
    } else {
      dismiss();
    }
  }

  if (dismissed) return null;
  if (!deferred && !iosVisible) return null;

  return (
    <div
      role="region"
      aria-label="Install ProdMatch.ai as an app"
      className="fixed bottom-20 right-4 left-4 z-40 mx-auto max-w-sm rounded-2xl border border-primary/30 bg-card/95 p-3.5 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:left-auto lg:bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <LogoMark size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Install ProdMatch.ai</p>
          {iosVisible && !deferred ? (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong> for one-tap access to your matches.
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              One-tap access to your AI matches. Adds to your home screen — no app store needed.
            </p>
          )}
          {deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
            >
              Install app
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
