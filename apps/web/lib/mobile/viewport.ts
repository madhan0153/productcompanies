export type MobileViewportSignals = {
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
};

export function isLikelyPhoneViewport(signals: MobileViewportSignals): boolean {
  const shortestSide = Math.min(signals.screenWidth, signals.screenHeight);
  return signals.maxTouchPoints > 0 && shortestSide > 0 && shortestSide <= 600;
}
