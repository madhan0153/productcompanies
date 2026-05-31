"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

// India-focused emotional copy — rotates inside ONE single card rather than
// being scattered across many. Each quote earns its 4-second slot.
const QUOTES: string[] = [
  "Your next ₹40 LPA role might be one tap away.",
  "Top product companies are hiring engineers like you — right now.",
  "Don't let the algorithm decide your career.",
  "Built for engineers who don't settle for the first offer.",
  "Your skills deserve better than \"we'll get back to you\".",
  "Hundreds of engineers crack their dream role with ProdMatch every month.",
  "Less than your morning chai — ₹3 a day.",
  "More strong-fit roles are waiting. Don't miss them.",
  "Unlimited matches. Tailor any resume. Land that offer.",
  "Your dream company is already in your match list.",
  "Stop applying to wrong roles. See every right one.",
  "Indian engineers like you are getting ₹50 LPA offers via ProdMatch.",
];

interface Props {
  /** Total number of locked rows beyond the free quota. */
  count:  number;
  /** Which tab we're on — copy adapts. */
  tab:    "shortlist" | "worth_a_look";
}

/**
 * The lock-screen. A single, attention-grabbing card with rotating quotes
 * and one clear CTA. Replaces the previous grid of N blurred cards which
 * felt clumsy on mobile.
 */
export function LockedMatchesPanel({ count, tab }: Props) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const tick = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 4_000);
    return () => clearInterval(tick);
  }, [reduce]);

  const tabLabel = tab === "shortlist" ? "priority" : "explore";
  const quote    = QUOTES[idx];

  return (
    <div className="relative mt-5 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-violet-500/8 p-6 shadow-elev1 sm:p-8">
      {/* Decorative sparkles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" aria-hidden />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Locked badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-3 py-1.5 backdrop-blur">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {count} more {tabLabel} {count === 1 ? "match" : "matches"} locked
          </span>
        </div>

        {/* Animated quote */}
        <div className="relative min-h-[3.75rem] w-full max-w-md sm:min-h-[4.5rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
              className="font-display text-lg font-semibold leading-snug text-balance sm:text-xl"
            >
              &ldquo;{quote}&rdquo;
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden>
          {QUOTES.slice(0, 6).map((_, i) => {
            const active = i === (idx % 6);
            return (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  active ? "w-5 bg-primary" : "w-1 bg-primary/30"
                }`}
              />
            );
          })}
        </div>

        {/* Primary CTA — opens the upgrade modal directly so the user can
            check out without losing their /matches scroll position. */}
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pop transition hover:bg-primary/90 sm:text-base"
        >
          <Sparkles className="h-4 w-4" />
          Unlock all matches — ₹3/day
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Secondary: full pricing page */}
        <Link
          href="/pricing"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Compare all plans →
        </Link>

        {/* Trust line */}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Cancel anytime · DPDP-compliant · UPI / Cards / Net banking
        </p>

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          trigger="matches_exhausted"
          returnTo="/matches"
        />

        {/* Blurred peek strip — decorative “there's more” signal */}
        <div className="mt-6 flex w-full max-w-md items-center gap-2 px-2 opacity-50">
          <div className="h-1.5 flex-1 rounded-full bg-primary/30" />
          <div className="h-1.5 flex-1 rounded-full bg-primary/20" />
          <div className="h-1.5 flex-1 rounded-full bg-primary/15" />
          <div className="h-1.5 flex-1 rounded-full bg-primary/10" />
        </div>
      </div>
    </div>
  );
}
