import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

// Emotional, India-focused copy that runs deterministically per card.
// Each card picks one quote based on its job_id hash — stable across renders,
// varied across the list so the page doesn't feel templated.
const QUOTES: string[] = [
  "Your next ₹40 LPA role might be one tap away.",
  "Top product companies are hiring engineers like you — right now.",
  "Don't let the algorithm decide your career. Unlock all matches.",
  "Built for engineers who don't settle for the first offer.",
  "Your skills deserve better than \"we'll get back to you\".",
  "Hundreds of engineers crack their dream role with ProdMatch every month.",
  "Pro at ₹3/day — less than your morning chai.",
  "More strong-fit roles are waiting. Don't miss them.",
  "Unlimited matches. Tailor any resume. Land that offer.",
  "You're worth the upgrade. Your dream company thinks so too.",
  "Stop applying to the wrong roles. See every right one.",
  "The next role that pays you what you're worth is locked behind this card.",
  "Your career sprint starts the moment you upgrade.",
  "Indian engineers like you are getting ₹50 LPA offers via ProdMatch.",
];

function hashIndex(jobId: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < jobId.length; i++) h = (h * 31 + jobId.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

interface Props {
  jobId:        string;
  companyName?: string | null;
  /** When true, render a small "locked" badge inline (no overlay). Used in dense lists. */
  compact?:     boolean;
}

export function LockedMatchCard({ jobId, companyName, compact }: Props) {
  const quote = QUOTES[hashIndex(jobId, QUOTES.length)];

  if (compact) {
    return (
      <Link
        href="/pricing"
        className="group relative block overflow-hidden rounded-xl border border-dashed border-primary/30 bg-card p-4 transition hover:border-primary hover:shadow-elev1"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground/90">
              Premium match — unlock with Pro
            </p>
            <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-primary opacity-60 transition group-hover:opacity-100" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
    >
      {/* Blurred preview "shape" — looks like a match card with content blurred */}
      <div className="pointer-events-none select-none p-4 blur-[10px] saturate-150 opacity-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-2.5 w-1/2 rounded bg-muted/70" />
          </div>
          <div className="h-6 w-12 rounded-full bg-primary/40" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-2 rounded bg-muted/60" />
          <div className="h-2 rounded bg-muted/60" />
          <div className="h-2 rounded bg-muted/60" />
        </div>
        <div className="mt-3 h-2 w-full rounded bg-muted/40" />
        <div className="mt-1.5 h-2 w-4/5 rounded bg-muted/40" />
      </div>

      {/* Overlay — emotional CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/85 via-background/95 to-background px-5 text-center backdrop-blur-[2px]">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm">
          <Lock className="h-4 w-4" />
        </div>
        <p className="max-w-xs text-sm font-semibold leading-snug text-balance">
          &ldquo;{quote}&rdquo;
        </p>
        <p className="text-[11px] text-muted-foreground">
          {companyName ? <>One of {companyName}&apos;s open roles is hidden. </> : null}
          Unlock with Pro · ₹3/day
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
          <Sparkles className="h-3 w-3" />
          See this match
        </span>
      </div>
    </Link>
  );
}
