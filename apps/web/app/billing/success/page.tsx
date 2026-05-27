"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { CHECKOUT_PRODUCTS, PLAN_LIMITS, type CheckoutProductId } from "@/lib/billing/catalog";

// Dodo redirects to /billing/success?product=pro_monthly&session=<nonce>
// after a completed checkout. We poll /api/billing/refresh (up to 10s) until
// the webhook has activated the subscription, then show the success state.

const MAX_POLL_MS  = 10_000;
const POLL_INTERVAL_MS = 1_500;

export default function BillingSuccessPage() {
  const params  = useSearchParams();
  const product = params.get("product") as CheckoutProductId | null;

  const [phase, setPhase]   = useState<"polling" | "activated" | "timeout">("polling");
  const [plan, setPlan]     = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    // Force-refresh entitlements immediately, then poll until plan > free
    async function refresh() {
      try {
        const res = await fetch("/api/billing/refresh", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json() as { plan?: string };
        if (data.plan && data.plan !== "free") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPlan(data.plan);
          setPhase("activated");
        }
      } catch {
        // ignore — keep polling
      }
    }

    refresh();
    pollRef.current = setInterval(() => {
      if (Date.now() - startRef.current > MAX_POLL_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase("timeout");
        return;
      }
      refresh();
    }, POLL_INTERVAL_MS);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const productInfo = product && product in CHECKOUT_PRODUCTS ? CHECKOUT_PRODUCTS[product] : null;
  const planLimits  = productInfo?.plan ? PLAN_LIMITS[productInfo.plan] : null;

  function planLabel(p: string) {
    if (p === "career_sprint") return "Career Sprint";
    if (p === "pro") return "Pro";
    return p;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      {phase === "polling" && (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="font-semibold">Activating your plan…</p>
          <p className="text-sm text-muted-foreground">
            We&apos;re waiting for payment confirmation. This takes a few seconds.
          </p>
        </div>
      )}

      {phase === "activated" && (
        <div className="max-w-sm space-y-5">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold">
              {planLabel(plan ?? "Pro")} activated 🎉
            </h1>
            <p className="text-sm text-muted-foreground">
              Your account has been upgraded. Everything is ready.
            </p>
          </div>

          {planLimits && (
            <ul className="rounded-xl border border-border bg-card p-4 text-left text-sm space-y-2">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Tailored resumes</span>
                <span className="font-semibold">{planLimits.tailoredResumeLimit}/month</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Unlimited matches</span>
                <span className="font-semibold">{planLimits.featureFlags.unlimitedMatches ? "✓" : "—"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Interview study plan</span>
                <span className="font-semibold">{planLimits.featureFlags.interviewStudyPlan ? "✓" : "—"}</span>
              </li>
            </ul>
          )}

          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-2"
          >
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {phase === "timeout" && (
        <div className="max-w-sm space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold">Payment received!</h1>
            <p className="text-sm text-muted-foreground">
              Your plan is being activated — it can take up to a minute.
              Refresh your dashboard if it doesn&apos;t appear shortly.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => { startRef.current = Date.now(); setPhase("polling"); }}
              className="btn-secondary text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
