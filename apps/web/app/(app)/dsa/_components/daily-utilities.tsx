"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CornerUpRight, Snowflake, Brain, X, Loader2, Check } from "lucide-react";
import { UpgradeModal, type UpgradeTrigger } from "@/components/billing/upgrade-modal";
import { skipTodayAction, freezeTodayAction } from "../actions";

type Sheet = null | "skip" | "freeze" | "recall";

export function DailyUtilities({
  slug,
  skips,
  freeze,
  recallCadence,
  todayStatus,
}: {
  slug: string;
  skips: { used: number; allowance: number; period: "week" | "day" };
  freeze: { available: number };
  recallCadence: "monthly" | "weekly" | "daily";
  todayStatus: "not_started" | "in_progress" | "solved";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, startTransition] = useTransition();
  const [upgrade, setUpgrade] = useState<UpgradeTrigger | null>(null);

  const skipsLeft = Math.max(0, skips.allowance - skips.used);
  const solved = todayStatus === "solved";

  function close() {
    setSheet(null);
  }

  function doSkip() {
    startTransition(async () => {
      const res = await skipTodayAction(slug);
      close();
      if (!res.ok) {
        setUpgrade("dsa_skip_exhausted");
      } else {
        router.refresh();
      }
    });
  }

  function doFreeze() {
    startTransition(async () => {
      const res = await freezeTodayAction(slug);
      close();
      if (!res.ok) {
        setUpgrade("dsa_skip_exhausted");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <UtilityButton
          icon={<CornerUpRight className="h-4 w-4" />}
          label="Skip"
          sub={skips.allowance >= 9999 ? "Unlimited" : `${skipsLeft} left / ${skips.period}`}
          disabled={solved}
          onClick={() => (skipsLeft > 0 ? setSheet("skip") : setUpgrade("dsa_skip_exhausted"))}
        />
        <UtilityButton
          icon={<Snowflake className="h-4 w-4" />}
          label="Freeze"
          sub={`${freeze.available} token${freeze.available === 1 ? "" : "s"}`}
          disabled={solved}
          onClick={() => (freeze.available > 0 ? setSheet("freeze") : setUpgrade("dsa_skip_exhausted"))}
        />
        <UtilityButton
          icon={<Brain className="h-4 w-4" />}
          label="Recall"
          sub={recallCadence[0].toUpperCase() + recallCadence.slice(1)}
          onClick={() => setSheet("recall")}
        />
      </div>

      {sheet === "skip" && (
        <ConfirmSheet
          title="Skip today's question?"
          body={`Your streak stays protected. You have ${skipsLeft} skip${skipsLeft === 1 ? "" : "s"} left this ${skips.period}.`}
          confirmLabel="Skip today"
          pending={pending}
          onConfirm={doSkip}
          onClose={close}
        />
      )}
      {sheet === "freeze" && (
        <ConfirmSheet
          title="Use a streak freeze?"
          body={`This keeps your streak alive for today without breaking it. You have ${freeze.available} freeze token${freeze.available === 1 ? "" : "s"}.`}
          confirmLabel="Use 1 freeze"
          pending={pending}
          onConfirm={doFreeze}
          onClose={close}
        />
      )}
      {sheet === "recall" && (
        <ConfirmSheet
          title="Recall day"
          body={`A short quiz on questions you've already solved, to lock them into long-term memory. Your plan includes ${recallCadence} recall.`}
          confirmLabel="Got it"
          pending={false}
          onConfirm={close}
          onClose={close}
        />
      )}

      <UpgradeModal
        open={upgrade !== null}
        onClose={() => setUpgrade(null)}
        trigger={upgrade ?? "generic"}
        returnTo={pathname ?? "/dsa"}
      />
    </>
  );
}

function UtilityButton({
  icon,
  label,
  sub,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press tap-target flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-2 py-2.5 text-center transition hover:border-primary/40 disabled:opacity-50 focus-ring"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </button>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-pop sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="press tap-target flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary focus-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="press tap-target flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 focus-ring"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
