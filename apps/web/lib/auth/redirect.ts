const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || CONTROL_CHARACTERS.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function oauthCallbackUrl(
  currentOrigin: string,
  configuredAppUrl: string,
  next: string | null | undefined,
): string {
  const configured = new URL(configuredAppUrl);
  const localConfigured = configured.hostname === "localhost" || configured.hostname === "127.0.0.1";
  const origin = localConfigured ? currentOrigin : configured.origin;
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeInternalPath(next));
  return callback.toString();
}
