import Link from "next/link";
import { Zap, Sparkles, Star, Calendar } from "lucide-react";
import { planLabel, type BillingPlan } from "@/lib/billing/catalog";

interface Props {
  plan:         BillingPlan;
  activeUntil:  string | null;
  /** Compact = single-line pill for nav/header. Default = card. */
  variant?:     "pill" | "card";
  className?:   string;
}

function daysBetween(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86_400_000);
}

/**
 * Server-component-safe (no hooks) badge showing the user's plan and remaining
 * subscription days. Tapping routes to /settings/billing. Designed to drop into
 * the profile header, dashboard hero, and any other plan-aware surface.
 */
export function DaysLeftBadge({ plan, activeUntil, variant = "pill", className }: Props) {
  const days  = activeUntil ? daysBetween(activeUntil) : null;
  const label = planLabel(plan);

  const Icon = plan === "career_sprint" ? Sparkles : plan === "pro" ? Zap : Star;

  const colour = plan === "career_sprint"
    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    : plan === "pro"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-border bg-secondary/40 text-muted-foreground";

  if (variant === "card") {
    return (
      <Link
        href="/settings/billing"
        className={`flex items-center gap-3 rounded-xl border p-3.5 transition hover:bg-secondary/60 ${colour} ${className ?? ""}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{label} plan</p>
          <p className="text-[11px] opacity-80">
            {plan === "free"
              ? "Upgrade for unlimited tailoring"
              : days === null
                ? "Lifetime access"
                : days <= 0
                  ? "Expires today"
                  : `${days} day${days === 1 ? "" : "s"} left in subscription`}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/settings/billing"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:bg-secondary ${colour} ${className ?? ""}`}
      aria-label={`${label} plan${days !== null ? ` — ${days} days remaining` : ""}`}
    >
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{label}</span>
      {plan !== "free" && days !== null && (
        <>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums opacity-90">
            <Calendar className="h-2.5 w-2.5" />
            {days <= 0 ? "ends today" : `${days}d left`}
          </span>
        </>
      )}
    </Link>
  );
}
