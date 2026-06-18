"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PWA_EVENTS } from "@/lib/pwa/install";

// Decodes the URL-safe base64 VAPID public key into the Uint8Array the
// PushManager expects as applicationServerKey.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Back with a concrete ArrayBuffer so the result is a valid BufferSource.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State = "loading" | "unsupported" | "off" | "on" | "blocked" | "inactive";

export function PushOptIn({
  vapidPublicKey,
  consentGranted,
}: {
  vapidPublicKey: string | null;
  consentGranted: boolean;
}) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      // Registration is deferred until page load. Wait briefly instead of
      // incorrectly declaring push inactive while the worker is still booting.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 8_000)),
      ]);
      if (!registration) {
        if (!cancelled) setState("inactive");
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existing.toJSON()),
        }).catch(() => undefined);
      }
      if (!cancelled) setState(existing ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    try {
      window.dispatchEvent(new CustomEvent(PWA_EVENTS.notificationStarted));
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        toast.info(permission === "denied" ? "Notifications are blocked" : "No changes made", {
          description:
            permission === "denied"
              ? "Use your browser's site permissions to re-enable them."
              : "You can enable notifications here whenever you're ready.",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(`subscribe failed (${res.status})`);
      }

      setState("on");
      toast.success("Push notifications on", {
        description: "We'll alert you when new strong-fit roles match.",
      });
    } catch {
      setState("off");
      toast.error("Couldn't enable push notifications", {
        description: "Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error();
      toast.success(data?.message ?? "Test notification sent.");
    } catch {
      toast.error("Test notification could not be sent", {
        description: "Check this device's browser permission and try again.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe().catch(() => undefined);
      }
      setState("off");
      toast.success("Push notifications off");
    } finally {
      setBusy(false);
    }
  }

  // --- Non-actionable states -------------------------------------------------
  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking device…
      </div>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        This browser doesn&apos;t support push notifications. Try installing the app or using a
        recent version of Chrome, Edge, or Safari.
      </p>
    );
  }
  if (!vapidPublicKey) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Push notifications are being configured and will be available shortly.
      </p>
    );
  }
  if (!consentGranted) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Turn on the <span className="font-medium text-foreground">Push Notifications</span> permission
        above and save to enable alerts on this device.
      </p>
    );
  }
  if (state === "inactive") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Open the installed app (or the production site) to enable push on this device.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 p-3">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Notifications are blocked in your browser settings for this site. Re-enable them in your
          browser&apos;s site permissions, then refresh.
        </p>
      </div>
    );
  }

  // --- Actionable: on / off --------------------------------------------------
  const isOn = state === "on";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isOn ? "bg-primary-soft text-primary-soft-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {isOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {isOn ? "On for this device" : "Off on this device"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isOn
              ? "You'll get a push when new strong-fit roles match your profile."
              : "Get instant alerts the moment a strong-fit role appears."}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {isOn && (
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-ring disabled:opacity-60"
          >
            {testing && <Loader2 className="h-4 w-4 animate-spin" />}
            Send test
          </button>
        )}
        <button
          type="button"
          onClick={isOn ? disable : enable}
          disabled={busy}
          aria-pressed={isOn}
          className={`press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-ring disabled:opacity-60 ${
            isOn
              ? "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOn ? (
            <BellOff className="h-3.5 w-3.5" />
          ) : (
            <BellRing className="h-3.5 w-3.5" />
          )}
          {isOn ? "Turn off" : "Enable on this device"}
        </button>
      </div>
    </div>
  );
}
