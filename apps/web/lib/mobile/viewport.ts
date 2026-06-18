export type MobileViewportSignals = {
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
  coarsePointer?: boolean;
  viewportWidth?: number;
  outerWidth?: number;
  outerHeight?: number;
  devicePixelRatio?: number;
};

export function isLikelyPhoneViewport(signals: MobileViewportSignals): boolean {
  const shortestSide = Math.min(signals.screenWidth, signals.screenHeight);
  if (signals.maxTouchPoints <= 0) return false;
  if (shortestSide > 0 && shortestSide <= 600) return true;

  const dpr = signals.devicePixelRatio ?? 1;
  const outerShortest = Math.min(signals.outerWidth ?? 0, signals.outerHeight ?? 0);
  const inferredDeviceWidth = dpr > 1 && outerShortest > 0 ? outerShortest / dpr : 0;
  return signals.coarsePointer === true && inferredDeviceWidth >= 280 && inferredDeviceWidth <= 600;
}

export function phoneDesktopViewportCompensation(signals: MobileViewportSignals): {
  zoom: number;
  widthPercent: number;
} | null {
  if (!isLikelyPhoneViewport(signals)) return null;
  const viewportWidth = signals.viewportWidth ?? 0;
  const dpr = signals.devicePixelRatio ?? 1;
  const outerShortest = Math.min(signals.outerWidth ?? 0, signals.outerHeight ?? 0);
  const inferredDeviceWidth = dpr > 1 && outerShortest > 0 ? outerShortest / dpr : 0;
  if (viewportWidth < 700 || inferredDeviceWidth < 280 || inferredDeviceWidth > 600) return null;

  const zoom = Math.min(3.5, Math.max(1, viewportWidth / inferredDeviceWidth));
  if (zoom < 1.35) return null;
  return { zoom, widthPercent: 100 / zoom };
}
