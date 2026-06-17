"use client";

import Link from "next/link";
import { Zap, Sparkles, Star, Shield } from "lucide-react";

interface Props {
  plan:          "free" | "pro" | "career_sprint";
  tailorUsed:    number;
  tailorLimit:   number;
  /** Optional credit count to display when free quota is exhausted */
  tailorCredits?: number;
  /** When true, this user is on the ADMIN_EMAILS allowlist and their
   * "Sprint" tier is the superuser override, not a real subscription.
   * Surface it visibly so staff don't confuse themselves about real billing state. */
  isAdmin?:      boolean;
}

/**
 * Compact, always-visible "you're on Free · 3/5 tailors" indicator.
 * Tap → /settings/billing. Tries to convert free users at a glance.
 */
export function UsageChip({ plan, tailorUsed, tailorLimit, tailorCredits = 0, isAdmin = false }: Props) {
  if (plan === "career_sprint") {
    if (isAdmin) {
      return (
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success hover:bg-success/15"
          aria-label="Staff override — full Sprint entitlements"
        >
          <Shield className="h-3 w-3" />
          Staff · Sprint
        </Link>
      );
    }
    return (
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 rounded-full border border-premium/30 bg-premium/10 px-2.5 py-1 text-[11px] font-semibold text-premium-soft-foreground hover:bg-premium/15"
        aria-label="Career Sprint subscription — open billing"
      >
        <Sparkles className="h-3 w-3" />
        Sprint
      </Link>
    );
  }
  if (plan === "pro") {
    return (
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
        aria-label="Pro subscription — open billing"
      >
        <Zap className="h-3 w-3" />
        Pro
      </Link>
    );
  }

  // Free user — show progress, conversion-oriented
  const exhausted = tailorUsed >= tailorLimit;
  const nearLimit = tailorUsed >= tailorLimit - 1;
  const pct       = Math.min(100, Math.round((tailorUsed / tailorLimit) * 100));

  if (exhausted && tailorCredits === 0) {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/15"
      >
        <Star className="h-3 w-3" />
        Upgrade · ₹3/day
      </Link>
    );
  }

  return (
    <Link
      href="/settings/billing"
      className={`group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:bg-secondary ${
        nearLimit
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-secondary/40 text-muted-foreground"
      }`}
      aria-label={`Free plan — ${tailorUsed} of ${tailorLimit} tailored resumes used`}
    >
      <span className="font-semibold">Free</span>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-border">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${nearLimit ? "bg-amber-500" : "bg-primary/70"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="tabular-nums">
        {tailorUsed}/{tailorLimit}
      </span>
    </Link>
  );
}
