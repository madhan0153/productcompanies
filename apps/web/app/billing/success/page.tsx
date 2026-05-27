"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight, AlertTriangle, Copy } from "lucide-react";
import {
  CHECKOUT_PRODUCTS, PLAN_LIMITS, planLabel, type CheckoutProductId,
} from "@/lib/billing/catalog";

// Dodo redirects to /billing/success?product=...&session=...&return_to=...
// after a completed checkout. We poll /api/billing/refresh until the webhook
// activates the subscription, then send the user back to where they were.

const MAX_POLL_MS      = 12_000;
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
  const returnTo = params.get("return_to") ?? "";

  const [phase, setPhase] = useState<"polling" | "activated" | "timeout">("polling");
  const [plan, setPlan]   = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(MAX_POLL_MS / 1000));
  const [copied, setCopied] = useState(false);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  // Detect the env-misconfig case (checkout returned to localhost)
  const onWrongHost = typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  useEffect(() => {
    if (onWrongHost) return; // can't poll our API from localhost in prod context

    async function refresh() {
      try {
        const res = await fetch("/api/billing/refresh", { method: "POST", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { plan?: string };
        if (data.plan && data.plan !== "free") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPlan(data.plan);
          setPhase("activated");
        }
      } catch { /* keep polling */ }
    }

    refresh();
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

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [onWrongHost]);

  // Auto-redirect to return_to once activated (with brief celebration window)
  useEffect(() => {
    if (phase !== "activated" || !returnTo) return;
    const t = setTimeout(() => { window.location.href = returnTo; }, 2400);
    return () => clearTimeout(t);
  }, [phase, returnTo]);

  const productInfo = product && product in CHECKOUT_PRODUCTS ? CHECKOUT_PRODUCTS[product] : null;
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
    const correctUrl = `https://prodmatchai.in/settings/billing`;
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
            <h1 className="font-display text-xl font-bold">Activating your plan…</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Waiting for the payment confirmation from your bank — usually under 10 seconds.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{secondsLeft}s remaining</p>
          </div>
        </div>
      </Centered>
    );
  }

  // ── Activated ──────────────────────────────────────────────────────────
  if (phase === "activated") {
    return (
      <Centered>
        <div className="max-w-md space-y-5 text-center">
          <div className="relative inline-block">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <span className="absolute -right-1 -top-1 animate-ping rounded-full bg-emerald-500/30 p-3" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">
              {planLabel((plan ?? "pro") as "pro" | "career_sprint" | "free")} is live 🎉
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is upgraded. Receipts will land in your inbox.
            </p>
          </div>

          {planLimits && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-left">
              <Row label="Tailored resumes / month" value={String(planLimits.tailoredResumeLimit)} />
              <Row label="Match views"              value={planLimits.featureFlags.unlimitedMatches ? "Unlimited" : String(planLimits.matchesViewLimit)} />
              <Row label="Interview study plan"     value={planLimits.featureFlags.interviewStudyPlan ? "✓" : "—"} />
              <Row label="DSA personalization"      value={planLimits.featureFlags.dsaPersonalization ? "✓" : "—"} />
            </div>
          )}

          <Link
            href={returnTo || "/dashboard"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {returnTo ? "Continue where you left off" : "Go to dashboard"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {returnTo && (
            <p className="text-[11px] text-muted-foreground">
              Auto-redirecting in a moment…
            </p>
          )}
          <Link href="/settings/billing" className="block text-xs text-muted-foreground hover:text-foreground">
            View plan & billing →
          </Link>
        </div>
      </Centered>
    );
  }

  // ── Timeout (payment received but webhook delayed) ─────────────────────
  return (
    <Centered>
      <div className="max-w-md space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <div>
          <h1 className="font-display text-2xl font-bold">Payment received ✅</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan is being activated — this can take up to a minute on a busy day.
            We'll email a receipt either way.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={returnTo || "/dashboard"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => { startRef.current = Date.now(); setPhase("polling"); setSecondsLeft(Math.ceil(MAX_POLL_MS / 1000)); }}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Try again
          </button>
        </div>

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
            {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
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
