"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X, Zap, Check, Loader2, ArrowRight, Sparkles, CreditCard,
} from "lucide-react";
import { PRICING_COPY, type CheckoutProductId } from "@/lib/billing/catalog";
import { useAvailability } from "@/lib/billing/use-availability";

// ─── Trigger registry ─────────────────────────────────────────────────────────
// One source of truth for which UX moment fired the modal — used for both
// copy and analytics attribution later.

export type UpgradeTrigger =
  | "tailor_exhausted"
  | "matches_exhausted"
  | "strong_fit_locked"
  | "advanced_filter"
  | "interview_plan"
  | "reparse_locked"
  | "priority_recompute"
  | "dsa_full_approach"
  | "dsa_other_langs"
  | "dsa_skip_exhausted"
  | "dsa_streak_milestone"
  | "dsa_company_track"
  | "dsa_ai_coach"
  | "dsa_bonus_practice"
  | "dsa_freeze_exhausted"
  | "generic";

interface TriggerCopy {
  eyebrow: string;
  title:   string;
  body:    string;
  ctaSecondary?: { label: string; href: string };
}

// Wiring status (search the codebase to confirm callsites):
//   wired:    tailor_exhausted, matches_exhausted, dsa_*, generic
//   reserved: strong_fit_locked, advanced_filter, interview_plan,
//             reparse_locked, priority_recompute
// Reserved triggers exist as copy ready for surfaces that aren't built yet
// (individual strong-fit cards, Pro filter chips, an interview plan banner,
// re-parse quota gate, "Recompute now" button). When those land, they should
// import this enum rather than reinvent the copy.
const TRIGGER_COPY: Record<UpgradeTrigger, TriggerCopy> = {
  tailor_exhausted: {
    eyebrow: "You're applying! 🎯",
    title:   "5 of 5 free tailored resumes used",
    body:    "Pro is ₹3/day. Tailor 30 resumes a month, plus everything else.",
    ctaSecondary: { label: "Buy a credit pack instead", href: "/pricing#credits" },
  },
  matches_exhausted: {
    eyebrow: "You've seen 20 matches",
    title:   "More strong-fit roles waiting",
    body:    "Pro unlocks unlimited matches and the priority queue.",
  },
  strong_fit_locked: {
    eyebrow: "🔥 Strong fit detected",
    title:   "Don't miss this one",
    body:    "Tailor your resume to this exact role in 30 seconds with Pro.",
  },
  advanced_filter: {
    eyebrow: "Pro filter",
    title:   "Advanced signals are Pro",
    body:    "Filter by tech stack overlap, comp range, and recency.",
  },
  interview_plan: {
    eyebrow: "Lock it in",
    title:   "Get a personalised interview plan",
    body:    "Pro generates a study plan tailored to the company and role.",
  },
  reparse_locked: {
    eyebrow: "Re-parse",
    title:   "Resume re-parses are a Pro feature",
    body:    "Updated your CV? Pro gives 5 re-parses per month.",
  },
  priority_recompute: {
    eyebrow: "Priority compute",
    title:   "Recompute your matches now",
    body:    "Pro jumps you to the head of the match-compute queue.",
  },
  dsa_full_approach: {
    eyebrow: "Halfway there",
    title:   "Want the full step-by-step explanation?",
    body:    "Pro is only ₹3.30/day — full approaches and solution steps, every day.",
  },
  dsa_other_langs: {
    eyebrow: "One language down",
    title:   "See it in Java and C++ instantly",
    body:    "Pro unlocks every solution in all three languages, side by side.",
  },
  dsa_skip_exhausted: {
    eyebrow: "Out of skips",
    title:   "Pro gives you 3 skips a day",
    body:    "Never break a streak you cared about — upgrade for ₹3/day.",
  },
  dsa_streak_milestone: {
    eyebrow: "🔥 You're on a streak",
    title:   "Keep it going",
    body:    "Pro members keep streaks 2.3× longer on average.",
  },
  dsa_company_track: {
    eyebrow: "🔥 Strong match",
    title:   "Unlock the full company Deep Dive track",
    body:    "Your resume matches multiple roles there. Career Sprint opens the curated 30-problem track.",
    ctaSecondary: { label: "Compare all plans", href: "/pricing" },
  },
  dsa_ai_coach: {
    eyebrow: "AI Coach",
    title:   "Daily personalized feedback",
    body:    "Career Sprint reflects on your solve patterns every single day.",
  },
  dsa_bonus_practice: {
    eyebrow: "More reps",
    title:   "5 bonus questions a day with Pro",
    body:    "Go beyond today's pick. Pro adds 5 daily; Career Sprint is unlimited.",
  },
  dsa_freeze_exhausted: {
    eyebrow: "Out of freezes",
    title:   "Pro gives you 3 freeze tokens",
    body:    "Pause your streak on busy days. Pro accrues 1 freeze every 3 days, up to 3.",
  },
  generic: {
    eyebrow: "Upgrade",
    title:   "Unlock the full ProdMatch experience",
    body:    "Pro is ₹3/day. Unlimited matches, 30 tailors a month, no ads.",
  },
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface UpgradeModalProps {
  open:    boolean;
  onClose: () => void;
  trigger: UpgradeTrigger;
  /** Page the user came from — they are returned here after activation. */
  returnTo?: string;
}

export function UpgradeModal({ open, onClose, trigger, returnTo }: UpgradeModalProps) {
  const router  = useRouter();
  const reduce  = useReducedMotion();
  const copy    = TRIGGER_COPY[trigger];
  const availability = useAvailability();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  // Per-session "this product is misconfigured" set — once a checkout returns
  // code "unavailable", we dim that button for the rest of the visit even if
  // the availability probe was optimistic.
  const [unavailable, setUnavailable] = useState<Set<CheckoutProductId>>(new Set());

  const isUnavailable = (id: CheckoutProductId): boolean =>
    unavailable.has(id) || !availability.isAvailable(id);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Reset transient state after close, but only after the exit animation has
  // played out — otherwise the user sees the error banner vanish mid-fade.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => { setError(null); setLoading(null); }, 260);
    return () => clearTimeout(t);
  }, [open]);

  async function startCheckout(product: CheckoutProductId) {
    if (isUnavailable(product)) return; // hard-stop: button is decorative
    setError(null);
    setLoading(product);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, returnTo: returnTo ?? window.location.pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setLoading(null);
        if (data.code === "unavailable") {
          setUnavailable((prev) => {
            const next = new Set(prev);
            next.add(product);
            return next;
          });
          setError("That plan isn't available yet — try a different one or use a coupon.");
        } else {
          setError(data.error ?? "We couldn't start checkout. Please try again.");
        }
        return;
      }
      if (!data.checkoutUrl) {
        setLoading(null);
        setError("This plan is temporarily unavailable. Please try again shortly or pick another plan.");
        return;
      }
      // Same-tab redirect — reliable on mobile (no popup blockers); the user
      // returns to /billing/success?return_to=… after payment, then back here.
      window.location.assign(data.checkoutUrl);
    } catch {
      setLoading(null);
      setError("Network error. Please check your connection and try again.");
    }
  }

  const fade = reduce ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: { duration: 0.18 },
  };
  const sheet = reduce ? {} : {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit:    { opacity: 0, y: 24, scale: 0.98 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...fade}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            {...sheet}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-pop sm:rounded-2xl"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Hero */}
            <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-5 pb-3 pt-6">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                {copy.eyebrow}
              </p>
              <h2 className="font-display text-lg font-bold leading-tight sm:text-xl">
                {copy.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{copy.body}</p>
            </div>

            {/* Pro card — primary recommendation */}
            <div className="space-y-3 px-5 pb-5 pt-3">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium leading-snug text-destructive"
                >
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => startCheckout("pro_monthly")}
                disabled={!!loading || isUnavailable("pro_monthly")}
                aria-label={isUnavailable("pro_monthly") ? "Pro — coming soon" : "Upgrade to Pro"}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/8 p-4 text-left transition hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary/8"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Pro</span>
                    {isUnavailable("pro_monthly") ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Coming soon
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Most popular
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-bold">{PRICING_COPY.proPerDay}</span>
                    <span className="text-xs text-muted-foreground">· billed {PRICING_COPY.proMonthly}/mo</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" />Unlimited matches</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" />30 tailored resumes / month</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" />Interview study plan + DSA</li>
                  </ul>
                </div>
                {loading === "pro_monthly" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-0.5" />
                )}
              </button>

              {/* Sprint — contrast comparison */}
              <button
                type="button"
                onClick={() => startCheckout("career_sprint_monthly")}
                disabled={!!loading || isUnavailable("career_sprint_monthly")}
                aria-label={isUnavailable("career_sprint_monthly") ? "Career Sprint — coming soon" : "Upgrade to Career Sprint"}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition hover:border-violet-500/40 hover:bg-violet-500/5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-background"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-sm font-semibold">Career Sprint</span>
                    {isUnavailable("career_sprint_monthly") && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {PRICING_COPY.sprintPerDay} · 100 tailors + priority queue + premium exports
                  </p>
                </div>
                {loading === "career_sprint_monthly"
                  ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
                  : <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />}
              </button>

              {/* Secondary actions */}
              <div className="flex flex-col gap-2 pt-1 text-center text-[11px]">
                {copy.ctaSecondary && (
                  <Link
                    href={copy.ctaSecondary.href}
                    className="inline-flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <CreditCard className="h-3 w-3" />
                    {copy.ctaSecondary.label}
                  </Link>
                )}
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                  Compare all plans →
                </Link>
              </div>

              {/* Trust strip */}
              <div className="border-t border-border/60 pt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
                Cancel anytime · DPDP-compliant · UPI · Cards · Net banking
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
