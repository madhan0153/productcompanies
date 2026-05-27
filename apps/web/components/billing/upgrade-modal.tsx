"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X, Zap, Check, Loader2, ArrowRight, Sparkles, CreditCard,
} from "lucide-react";
import { PRICING_COPY } from "@/lib/billing/catalog";

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
  | "generic";

interface TriggerCopy {
  eyebrow: string;
  title:   string;
  body:    string;
  ctaSecondary?: { label: string; href: string };
}

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
  const [loading, setLoading] = useState<string | null>(null);

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

  async function startCheckout(product: string) {
    setLoading(product);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, returnTo: returnTo ?? window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setLoading(null);
        alert(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setLoading(null);
      alert("Network error. Please try again.");
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
              <button
                type="button"
                onClick={() => startCheckout("pro_monthly")}
                disabled={!!loading}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/8 p-4 text-left transition hover:bg-primary/12 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Pro</span>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Most popular
                    </span>
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
                disabled={!!loading}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition hover:border-violet-500/40 hover:bg-violet-500/5 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-sm font-semibold">Career Sprint</span>
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
