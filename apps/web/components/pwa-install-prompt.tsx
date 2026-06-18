"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  PWA_EVENTS,
  emitPwaState,
  isStandalonePwa,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

const DISMISSED_KEY = "prodmatch.pwa.install.dismissed_until";
const VISITS_KEY = "prodmatch.pwa.engaged_sessions";
const SESSION_KEY = "prodmatch.pwa.session_counted";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const NOTIFICATION_PROMPT_PAUSE_MS = 24 * 60 * 60 * 1000;

type ManualInstall = "ios" | "mac-safari" | "in-app" | null;

function trackClarity(key: string, value: string) {
  try {
    const clarity = (
      window as Window & {
        clarity?: (action: string, key: string, value: string) => void;
      }
    ).clarity;
    clarity?.("set", key, value);
  } catch {
    // Analytics must never affect the install experience.
  }
}

function manualInstallKind(): ManualInstall {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|Instagram|LinkedInApp|WhatsApp/i.test(ua)) return "in-app";
  const iosSafari =
    /iPad|iPhone|iPod/i.test(ua) &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (iosSafari) return "ios";
  const macSafari =
    /Macintosh/i.test(ua) &&
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|Edg/i.test(ua);
  return macSafari ? "mac-safari" : null;
}

function anotherInterruptionIsOpen() {
  const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
  const keyboardOpen =
    window.visualViewport != null &&
    window.visualViewport.height < window.innerHeight * 0.72;
  return Boolean(dialog) || keyboardOpen;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [manual, setManual] = useState<ManualInstall>(null);
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const trapRef = useFocusTrap(!dismissed);

  useEscapeKey(() => {
    if (!dismissed) dismiss();
  });

  useEffect(() => {
    if (isStandalonePwa()) {
      emitPwaState("installed");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      const sessions = Number(localStorage.getItem(VISITS_KEY) ?? 0) + 1;
      localStorage.setItem(VISITS_KEY, String(sessions));
      sessionStorage.setItem(SESSION_KEY, "true");
    }

    if (Date.now() < Number(localStorage.getItem(DISMISSED_KEY) ?? 0)) return;
    const sessions = Number(localStorage.getItem(VISITS_KEY) ?? 0);
    const hasMeaningfulRoute = /^\/(matches|jobs\/|applications|dsa|dashboard)/.test(
      pathname,
    );
    if (sessions < 2 || !hasMeaningfulRoute) return;

    const timer = window.setTimeout(() => {
      if (anotherInterruptionIsOpen()) return;
      const prompt = window.__prodmatchInstallPrompt;
      const installKind = manualInstallKind();
      if (!prompt && !installKind) return;
      setDeferred(prompt ?? null);
      setManual(installKind);
      setEligible(true);
      setDismissed(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const remember = (event?: Event) => {
      const prompt = event
        ? (event as BeforeInstallPromptEvent)
        : window.__prodmatchInstallPrompt;
      if (!prompt) return;
      prompt.preventDefault();
      window.__prodmatchInstallPrompt = prompt;
      setDeferred(prompt);
      emitPwaState("available");
      const sessions = Number(localStorage.getItem(VISITS_KEY) ?? 0);
      const routeIsEligible = /^\/(matches|jobs\/|applications|dsa|dashboard)/.test(
        pathname,
      );
      const cooldownExpired =
        Date.now() >= Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
      if (
        sessions >= 2 &&
        routeIsEligible &&
        cooldownExpired &&
        !anotherInterruptionIsOpen()
      ) {
        setEligible(true);
        setDismissed(false);
      }
    };
    const nativeHandler = (event: Event) => remember(event);
    const capturedHandler = () => remember();
    remember();
    window.addEventListener("beforeinstallprompt", nativeHandler);
    window.addEventListener(PWA_EVENTS.available, capturedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", nativeHandler);
      window.removeEventListener(PWA_EVENTS.available, capturedHandler);
    };
  }, [pathname]);

  useEffect(() => {
    const kind = manualInstallKind();
    emitPwaState(
      window.__prodmatchInstallPrompt ? "available" : kind ? "manual" : "unavailable",
    );

    const openHandler = () => {
      if (isStandalonePwa()) return;
      const prompt = window.__prodmatchInstallPrompt;
      setDeferred(prompt ?? null);
      setManual(manualInstallKind());
      setEligible(true);
      setManualOpen(true);
      setDismissed(false);
    };
    const notificationHandler = () => {
      localStorage.setItem(
        DISMISSED_KEY,
        String(Date.now() + NOTIFICATION_PROMPT_PAUSE_MS),
      );
      setManualOpen(false);
      setDismissed(true);
    };
    window.addEventListener(PWA_EVENTS.open, openHandler);
    window.addEventListener(PWA_EVENTS.notificationStarted, notificationHandler);
    return () => {
      window.removeEventListener(PWA_EVENTS.open, openHandler);
      window.removeEventListener(PWA_EVENTS.notificationStarted, notificationHandler);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      trackClarity("pwa_install", "true");
      delete window.__prodmatchInstallPrompt;
      setDeferred(null);
      setManualOpen(false);
      setDismissed(true);
      emitPwaState("installed");
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  function dismiss() {
    if (!manualOpen) {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_MS));
    }
    trackClarity("pwa_dismiss", "true");
    setManualOpen(false);
    setManual(null);
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    delete window.__prodmatchInstallPrompt;
    if (outcome === "accepted") {
      setDismissed(true);
    } else {
      dismiss();
    }
  }

  if (!eligible || dismissed || (!deferred && !manual)) return null;

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-sm rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:left-auto sm:right-4 lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-start gap-3">
        <LogoMark size={40} />
        <div className="min-w-0 flex-1">
          <h2 id="pwa-install-title" className="text-sm font-semibold leading-tight">
            Install ProdMatch
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Get faster access to your matches, applications and interview reminders from
            your home screen.
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
          {manual === "in-app" && !deferred && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Open this page in Chrome, Edge, or Safari to install ProdMatch.
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
              Not now
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
    </div>
  );
}
