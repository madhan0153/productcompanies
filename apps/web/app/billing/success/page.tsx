"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight, AlertTriangle, Copy } from "lucide-react";
import {
  CHECKOUT_PRODUCTS, PLAN_LIMITS, type CheckoutProductId,
} from "@/lib/billing/catalog";
import { clientEnv } from "@/lib/env";
import { CelebrationOverlay } from "./celebration";

// Dodo redirects to /billing/success?product=...&session=...&return_to=...
// after a completed checkout. We poll /api/billing/refresh until the webhook
// activates the subscription, then send the user back to where they were.

const MAX_POLL_MS      = 90_000;
const POLL_INTERVAL_MS = 1_500;

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}

function BillingSuccessContent() {
  const params   = useSearchParams();
  const product  = params.get("product") as CheckoutProductId | null;
  const session  = params.get("session") ?? "";
  const subId    = params.get("subscription_id") ?? "";
  const email    = params.get("email")    ?? "";
  // Guard against open redirect: only accept same-origin relative paths
  const rawReturnTo = params.get("return_to") ?? "";
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/dashboard";
  const productInfo = product && product in CHECKOUT_PRODUCTS ? CHECKOUT_PRODUCTS[product] : null;
  const verificationOnly = productInfo?.verificationOnly === true;

  const [phase, setPhase] = useState<"polling" | "activated" | "timeout">("polling");
  const [plan, setPlan]   = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(MAX_POLL_MS / 1000));
  const [copied, setCopied] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  // Detect the env-misconfig case (checkout returned to localhost)
  const onWrongHost = typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  useEffect(() => {
    if (onWrongHost) return; // can't poll our API from localhost in prod context

    let cancelled = false;

    // Phase 1: a one-shot direct sync using the subscription_id from the URL.
    // This bypasses webhook latency entirely — we query Dodo's API directly,
    // create the local subscription/entitlement rows, and refresh. If this
    // succeeds, the user sees "activated" almost instantly.
    async function syncFromReturn() {
      if (!subId) return;
      try {
        const res = await fetch("/api/billing/sync", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          cache:   "no-store",
          body:    JSON.stringify({
            subscription_id: subId,
            product,
            session,
            emailHint: email || undefined,
          }),
        });
        if (cancelled) return;
        const data = await res.json() as { plan?: string; error?: string; details?: unknown };
        if (!res.ok) {
          // Surface the error to the user so they can take action / contact support
          console.warn("[billing/success] sync failed", { status: res.status });
          if (res.status === 403) {
            // Ownership mismatch — most actionable error
            setSyncError(
              typeof data.error === "string"
                ? `${data.error} Try refreshing — or contact support with subscription id ${subId}.`
                : "We couldn't link this subscription to your account."
            );
          }
          return;
        }
        if (data.plan && data.plan !== "free") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPlan(data.plan);
          setPhase("activated");
        }
      } catch (err) {
        console.warn("[billing/success] sync error", { name: err instanceof Error ? err.name : "unknown" });
      }
    }

    // Phase 2: redundant polling for the webhook-driven path, in case sync
    // failed (e.g. Dodo API down) but the webhook eventually arrives.
    async function refresh() {
      try {
        if (!product) return;
        const res = await fetch("/api/billing/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ product, session }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json() as { confirmed?: boolean; plan?: string };
        if (data.confirmed) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPlan(data.plan ?? "free");
          setPhase("activated");
        }
      } catch { /* keep polling */ }
    }

    // Fire the direct sync immediately, then start polling as a safety net.
    syncFromReturn().then(() => { if (!cancelled) refresh(); });

    pollRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setSecondsLeft(Math.max(0, Math.ceil((MAX_POLL_MS - elapsed) / 1000)));
      if (elapsed > MAX_POLL_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase("timeout");
        return;
      }
      refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [onWrongHost, subId, product, email, session, retryAttempt]);

  // Auto-redirect to return_to once activated (with brief celebration window)
  useEffect(() => {
    if (phase !== "activated" || !returnTo) return;
    const t = setTimeout(() => { window.location.href = returnTo; }, 2400);
    return () => clearTimeout(t);
  }, [phase, returnTo]);

  const planLimits  = productInfo?.plan ? PLAN_LIMITS[productInfo.plan] : null;

  async function copySupport() {
    const text = `Subscription: ${subId || "?"} | Session: ${session || "?"} | Product: ${product || "?"} | Email: ${email || "?"}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch { /* ignore */ }
  }

  // ── Wrong-host fallback (env var misconfigured at checkout time) ───────
  if (onWrongHost) {
    const correctUrl = `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/settings/billing`;
    return (
      <Centered>
        <div className="max-w-md space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <div>
            <h1 className="font-display text-xl font-bold">Payment received ✅</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You arrived here from a test deployment because the app's return URL was set to localhost.
              <strong className="text-foreground"> Your payment is safe</strong> — receipts are in your email and your plan will activate.
            </p>
          </div>
          <a
            href={correctUrl}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Open ProdMatch.in <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-[11px] text-muted-foreground">
            (Admin: set <code className="rounded bg-background px-1">NEXT_PUBLIC_APP_URL=https://prodmatchai.in</code> in Vercel env.)
          </p>
        </div>
      </Centered>
    );
  }

  // ── Polling ────────────────────────────────────────────────────────────
  if (phase === "polling") {
    return (
      <Centered>
        <div className="max-w-md space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <div>
            <h1 className="font-display text-xl font-bold">
              {verificationOnly ? "Confirming your payment…" : "Activating your plan…"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Waiting for Dodo and securely linking the payment to your account.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{secondsLeft}s remaining</p>
          </div>

          {syncError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold">Heads up</p>
              <p className="mt-1">{syncError}</p>
              {subId && (
                <p className="mt-2 break-all">
                  <span className="opacity-70">Subscription:</span>{" "}
                  <code className="text-foreground">{subId}</code>
                </p>
              )}
            </div>
          )}
        </div>
      </Centered>
    );
  }

  // ── Activated ──────────────────────────────────────────────────────────
  if (phase === "activated") {
    return (
      <Centered>
        <div className="max-w-md space-y-5">
          {verificationOnly ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              <h1 className="mt-4 font-display text-2xl font-bold">₹10 payment verified</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The live transaction was recorded successfully. No paid plan or permanent entitlement was granted.
              </p>
            </div>
          ) : (
            <CelebrationOverlay
              plan={(plan ?? "pro") as "pro" | "career_sprint" | "free"}
              active
            />
          )}

          {planLimits && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-left">
              <Row label="Tailored resumes / month" value={String(planLimits.tailoredResumeLimit)} />
              <Row label="Match views"              value={planLimits.featureFlags.unlimitedMatches ? "Unlimited" : String(planLimits.matchesViewLimit)} />
              <Row label="Interview study plan"     value={planLimits.featureFlags.interviewStudyPlan ? "✓" : "—"} />
              <Row label="DSA personalization"      value={planLimits.featureFlags.dsaPersonalization ? "✓" : "—"} />
            </div>
          )}

          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href={returnTo || "/dashboard"}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {returnTo ? "Continue where you left off" : "Go to dashboard"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {returnTo && (
              <p className="text-[11px] text-muted-foreground">Auto-redirecting in a moment…</p>
            )}
            <Link href="/settings/billing" className="text-xs text-muted-foreground hover:text-foreground">
              View plan & billing →
            </Link>
          </div>
        </div>
      </Centered>
    );
  }

  // ── Timeout (payment received but webhook delayed) ─────────────────────
  return (
    <Centered>
      <div className="max-w-md space-y-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <div>
          <h1 className="font-display text-2xl font-bold">Confirmation pending</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your payment may be complete, but your plan is not active in ProdMatch yet. Keep this page open and check activation again.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              startRef.current = Date.now();
              setSyncError(null);
              setPhase("polling");
              setSecondsLeft(Math.ceil(MAX_POLL_MS / 1000));
              setRetryAttempt((attempt) => attempt + 1);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Check activation again <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href="/settings/billing"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-secondary"
          >
            View billing status
          </Link>
        </div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          Return to dashboard without activation
        </Link>

        {/* Support fallback — copy session identifiers */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-left">
          <p className="mb-2 text-xs font-semibold">Need help? Share these IDs with support:</p>
          <ul className="space-y-0.5 break-all text-[11px] text-muted-foreground">
            {subId && <li>Subscription: <code className="text-foreground">{subId}</code></li>}
            {session && <li>Session: <code className="text-foreground">{session}</code></li>}
            {product && <li>Product: <code className="text-foreground">{product}</code></li>}
            {email && <li>Email: <code className="text-foreground">{email}</code></li>}
          </ul>
          <button
            onClick={copySupport}
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium hover:bg-secondary/70"
          >
            {copied ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
