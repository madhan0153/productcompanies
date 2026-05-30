"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import { UpgradeModal, type UpgradeTrigger } from "@/components/billing/upgrade-modal";

// A locked feature teaser for the daily hub (Bonus practice, Company Deep Dive
// tracks, Interview Countdown). Reuses the shared UpgradeModal for checkout.

export function LockedTeaser({
  icon,
  title,
  body,
  ctaLabel,
  trigger,
  chips,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  trigger: UpgradeTrigger;
  chips?: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lift rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          {icon}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> {title}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>

      {chips && chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {c}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:gap-2 focus-ring"
      >
        {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
      </button>

      <UpgradeModal open={open} onClose={() => setOpen(false)} trigger={trigger} returnTo={pathname ?? "/dsa"} />
    </div>
  );
}
