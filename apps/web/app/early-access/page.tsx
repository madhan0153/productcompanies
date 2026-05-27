"use client";

import Link from "next/link";
import { useState } from "react";
import { Gift, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

// Note: metadata must be in a server component; this page is client-only.
// Title set via document.title in useEffect if needed; for now rely on root template.

type Phase = "idle" | "loading" | "success" | "error";

export default function EarlyAccessPage() {
  const [code, setCode]   = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPhase("loading");
    setMessage("");

    try {
      const res = await fetch("/api/billing/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; code?: string };

      if (!res.ok) {
        if (res.status === 401) {
          // Redirect to login, return here after
          window.location.href = `/auth/login?next=/early-access`;
          return;
        }
        setPhase("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setPhase("success");
      setMessage(data.message ?? "Access unlocked!");
    } catch {
      setPhase("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold">Founder&apos;s Friends Access</h1>
          <p className="text-sm text-muted-foreground">
            Have an early access code? Enter it below to unlock your membership benefits.
          </p>
        </div>

        {phase === "success" ? (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <p className="mb-1 font-semibold text-emerald-600 dark:text-emerald-400">{message}</p>
              <p className="text-sm text-muted-foreground">
                Your billing entitlements are active. Head to your dashboard to see your plan.
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="promo-code" className="mb-1.5 block text-sm font-medium">
                Access code
              </label>
              <input
                id="promo-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FRIEND-XXXX"
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 font-mono text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={phase === "loading"}
              />
            </div>

            {phase === "error" && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={phase === "loading" || !code.trim()}
              className="btn-primary w-full disabled:opacity-60"
            >
              {phase === "loading" ? "Redeeming…" : "Redeem code"}
            </button>
          </form>
        )}

        {/* Trust notes */}
        <div className="mt-8 space-y-2">
          <SecurityNote icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}>
            Access codes grant billing entitlements only — never admin access.
          </SecurityNote>
          <SecurityNote icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}>
            One redemption per account per code.
          </SecurityNote>
          <SecurityNote icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}>
            DPDP data export & erasure remain free forever.
          </SecurityNote>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Want to upgrade instead?{" "}
          <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground">
            View pricing
          </Link>
        </p>
      </div>
    </div>
  );
}

function SecurityNote({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
