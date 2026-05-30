"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { UpgradeModal, type UpgradeTrigger } from "@/components/billing/upgrade-modal";

// Inline upgrade surface used in the progressive reveal and the daily-hub
// teasers. Two modes:
//   - "upgrade": a single CTA into the shared UpgradeModal.
//   - "spend":   a Free user spends one monthly credit to unlock now, with a
//                secondary upgrade path.

export function InlinePaywall({
  trigger,
  headline,
  sub,
  variant = "upgrade",
  spendLabel,
  onSpend,
  spending = false,
  ctaLabel = "Unlock with Pro",
}: {
  trigger: UpgradeTrigger;
  headline: string;
  sub?: string;
  variant?: "upgrade" | "spend";
  spendLabel?: string;
  onSpend?: () => void;
  spending?: boolean;
  ctaLabel?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-primary-soft p-4 text-primary-soft-foreground">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        {headline}
      </p>
      {sub && <p className="mt-1 pl-6 text-xs leading-relaxed opacity-90">{sub}</p>}

      <div className="mt-3 flex flex-col gap-2 pl-6 sm:flex-row sm:items-center">
        {variant === "spend" && onSpend && (
          <button
            type="button"
            onClick={onSpend}
            disabled={spending}
            className="press tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 focus-ring"
          >
            {spending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {spendLabel ?? "Unlock now"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`press tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition focus-ring ${
            variant === "spend"
              ? "text-primary-soft-foreground hover:underline"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <UpgradeModal open={open} onClose={() => setOpen(false)} trigger={trigger} returnTo={pathname ?? "/dsa"} />
    </div>
  );
}
