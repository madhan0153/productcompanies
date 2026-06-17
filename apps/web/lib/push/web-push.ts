import webpush from "web-push";
import { serverEnv } from "@/lib/env";

// Lazily configure web-push with our VAPID identity. Returns null when keys
// aren't set so callers can degrade gracefully (consent + in-app log still
// work; only the push transport is skipped) instead of throwing.
let configured: typeof webpush | null | undefined;

export function getWebPush(): typeof webpush | null {
  if (configured !== undefined) return configured;

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = serverEnv;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    configured = null;
    return null;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = webpush;
  return webpush;
}
