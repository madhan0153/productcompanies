"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Sprint 4 — Item 25. Install prompt for the PWA.
//
// Chrome / Edge / Samsung Internet on Android dispatch `beforeinstallprompt`
// when the manifest + service worker + engagement criteria are met. iOS
// Safari does NOT fire it — users have to "Add to Home Screen" manually
// from the share menu. We detect iOS separately and show a one-line
// instructional banner.
//
// "Don't show again" is persisted in localStorage with a 30-day cooldown.
// If the user dismisses, we'll re-offer in a month rather than nag.

const DISMISSED_KEY = "prodmatch.pwa.install.dismissed_until";
const COOLDOWN_MS   = 30 * 24 * 3_600_000;

// Minimum window after first visit before we surface the prompt. Stops the
// prompt from flashing in the user's face on first signup. Persists across
// reloads via localStorage.
const FIRST_VISIT_KEY = "prodmatch.pwa.first_visit_at";
const FIRST_VISIT_GRACE_MS = 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Initial mount: check dismissal cooldown + first-visit grace.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed? PWA detection — match-media + iOS navigator quirk.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (inStandalone) return;

    const dismissedUntil = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() < dismissedUntil) return;

    let firstVisitAt = Number(localStorage.getItem(FIRST_VISIT_KEY) ?? 0);
    if (!firstVisitAt) {
      firstVisitAt = Date.now();
      try { localStorage.setItem(FIRST_VISIT_KEY, String(firstVisitAt)); } catch { /* ignore quota */ }
    }
    if (Date.now() - firstVisitAt < FIRST_VISIT_GRACE_MS) return;

    setDismissed(false);

    // iOS detection — no beforeinstallprompt support; show instructional banner.
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (isIos) setIosVisible(true);
  }, []);

  // Listen for the Android/Desktop install prompt event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS));
    } catch { /* ignore quota */ }
    setDeferred(null);
    setIosVisible(false);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
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
      // Positioned above the mobile bottom nav (h-~56px). On lg+ where the
      // bottom nav is hidden, the prompt sits at the very bottom-right corner.
      className="fixed bottom-20 right-4 left-4 z-40 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:left-auto lg:bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install ProdMatch.ai</p>
          {iosVisible && !deferred ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong> for one-tap access.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              One-tap access to your matches. Adds an icon to your home screen — no app store needed.
            </p>
          )}
          {deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-3 w-3" />
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
