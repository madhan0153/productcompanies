"use client";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __prodmatchInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export const PWA_EVENTS = {
  available: "prodmatch:pwa-install-available",
  open: "prodmatch:pwa-install-open",
  state: "prodmatch:pwa-install-state",
  notificationStarted: "prodmatch:notification-permission-started",
} as const;

export type PwaInstallState = "available" | "manual" | "installed" | "unavailable";

export function emitPwaState(state: PwaInstallState) {
  window.dispatchEvent(new CustomEvent(PWA_EVENTS.state, { detail: { state } }));
}

export function openPwaInstall() {
  window.dispatchEvent(new CustomEvent(PWA_EVENTS.open));
}

export function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
