"use client";

import { useLayoutEffect } from "react";
import { isLikelyPhoneViewport, phoneDesktopViewportCompensation } from "@/lib/mobile/viewport";

const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content";

function repairMobileViewport(): void {
  const signals = {
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
  const phone = isLikelyPhoneViewport(signals);

  if (!phone) {
    delete document.documentElement.dataset.mobileDevice;
    delete document.documentElement.dataset.mobileDesktopViewport;
    document.documentElement.style.removeProperty("--phone-viewport-zoom");
    document.documentElement.style.removeProperty("--phone-viewport-width");
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

  const compensation = phoneDesktopViewportCompensation(signals);
  if (compensation) {
    document.documentElement.dataset.mobileDesktopViewport = "phone";
    document.documentElement.style.setProperty("--phone-viewport-zoom", compensation.zoom.toFixed(4));
    document.documentElement.style.setProperty("--phone-viewport-width", `${compensation.widthPercent.toFixed(4)}%`);
  } else {
    delete document.documentElement.dataset.mobileDesktopViewport;
    document.documentElement.style.removeProperty("--phone-viewport-zoom");
    document.documentElement.style.removeProperty("--phone-viewport-width");
  }
}

export function MobileViewportGuard() {
  useLayoutEffect(() => {
    repairMobileViewport();
    const frame = window.requestAnimationFrame(repairMobileViewport);
    window.addEventListener("pageshow", repairMobileViewport);
    window.addEventListener("resize", repairMobileViewport);
    window.addEventListener("orientationchange", repairMobileViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", repairMobileViewport);
      window.removeEventListener("resize", repairMobileViewport);
      window.removeEventListener("orientationchange", repairMobileViewport);
    };
  }, []);

  return null;
}
