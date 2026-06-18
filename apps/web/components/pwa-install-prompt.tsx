"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { useEscapeKey } from "@/hooks/use-escape-key";

const DISMISSED_KEY = "prodmatch.pwa.install.dismissed_until";
const INSTALLED_KEY = "prodmatch.pwa.installed";
const VISITS_KEY = "prodmatch.pwa.engaged_sessions";
const SESSION_KEY = "prodmatch.pwa.session_counted";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type ManualInstall = "ios" | "mac-safari" | null;

function trackClarity(key: string, value: string) {
  try {
    const clarity = (window as Window & { clarity?: (action: string, key: string, value: string) => void }).clarity;
    clarity?.("set", key, value);
  } catch {
    // Analytics must never affect the install experience.
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function manualInstallKind(): ManualInstall {
  const ua = navigator.userAgent;
  const iosSafari = /iPad|iPhone|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (iosSafari) return "ios";
  const macSafari = /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
  return macSafari ? "mac-safari" : null;
}

function anotherInterruptionIsOpen() {
  const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
  const keyboardOpen =
    window.visualViewport != null && window.visualViewport.height < window.innerHeight * 0.72;
  return Boolean(dialog) || keyboardOpen;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [manual, setManual] = useState<ManualInstall>(null);
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEscapeKey(() => {
    if (!dismissed) dismiss();
  });

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true") return;
    if (Date.now() < Number(localStorage.getItem(DISMISSED_KEY) ?? 0)) return;

    if (!sessionStorage.getItem(SESSION_KEY)) {
      const sessions = Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1;
      localStorage.setItem(VISITS_KEY, String(sessions));
      sessionStorage.setItem(SESSION_KEY, "true");
    }

    const sessions = Number(localStorage.getItem(VISITS_KEY) ?? 0);
    const hasMeaningfulRoute = /^\/(matches|jobs\/|applications|dsa|dashboard)/.test(pathname);
    if (sessions < 2 || !hasMeaningfulRoute) return;

    const timer = window.setTimeout(() => {
      if (!anotherInterruptionIsOpen()) {
        setEligible(true);
        setManual(manualInstallKind());
        setDismissed(false);
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      trackClarity("pwa_install", "true");
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS));
    trackClarity("pwa_dismiss", "true");
    setDeferred(null);
    setManual(null);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      setDismissed(true);
    } else {
      dismiss();
    }
  }

  if (!eligible || dismissed || (!deferred && !manual)) return null;

  return (
    <section
      role="region"
      aria-labelledby="pwa-install-title"
      aria-live="polite"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-sm rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:left-auto sm:right-4 lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-start gap-3">
        <LogoMark size={40} />
        <div className="min-w-0 flex-1">
          <h2 id="pwa-install-title" className="text-sm font-semibold leading-tight">
            Install ProdMatch.ai
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Faster access to matches and reminders, with no app store required.
          </p>
          {manual === "ios" && !deferred && (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              In Safari, tap Share, then Add to Home Screen.
            </p>
          )}
          {manual === "mac-safari" && !deferred && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              In Safari, choose File, then Add to Dock.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-ring"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Install App
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-ring"
            >
              Not Now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install invitation"
          className="min-h-11 min-w-11 shrink-0 rounded-md p-2 text-muted-foreground transition hover:text-foreground focus-ring"
        >
          <X className="mx-auto h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
