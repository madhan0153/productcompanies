"use client";

import { useLayoutEffect } from "react";
import { isLikelyPhoneViewport } from "@/lib/mobile/viewport";

const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content";

function repairMobileViewport(): void {
  const phone = isLikelyPhoneViewport({
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });

  if (!phone) {
    delete document.documentElement.dataset.mobileDevice;
    return;
  }

  document.documentElement.dataset.mobileDevice = "phone";
  let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    document.head.appendChild(viewport);
  }
  if (viewport.content !== VIEWPORT_CONTENT) {
    viewport.content = VIEWPORT_CONTENT;
  }
}

export function MobileViewportGuard() {
  useLayoutEffect(() => {
    repairMobileViewport();
    window.addEventListener("pageshow", repairMobileViewport);
    window.addEventListener("orientationchange", repairMobileViewport);
    return () => {
      window.removeEventListener("pageshow", repairMobileViewport);
      window.removeEventListener("orientationchange", repairMobileViewport);
    };
  }, []);

  return null;
}
