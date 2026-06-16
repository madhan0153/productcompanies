"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles, Target, ArrowRight, CheckCircle2, Clock3, CornerUpRight,
  Snowflake, X, Loader2, Check,
} from "lucide-react";
import { DifficultyPill, Pill, BUCKET_LABEL, patternLabel, type Difficulty, type Bucket } from "./pills";
import { NextRefreshCountdown } from "./countdown";
import { UpgradeModal, type UpgradeTrigger } from "@/components/billing/upgrade-modal";
import { skipTodayAction, freezeTodayAction } from "../actions";

export interface HeroQuestion {
  slug: string;
  title: string;
  framing: string;
  difficulty: Difficulty;
  pattern: string;
  bucket: Bucket;
  minutes: number;
}

type Status = "not_started" | "in_progress" | "solved";
type Action = "assigned" | "started" | "solved" | "skipped" | "frozen";
type Sheet = null | "skip" | "freeze";

export function DailyPanel({
  q,
  signedIn,
  initialStatus,
  initialAction,
  skips,
  freeze,
  rationale,
  // recallCadence: still in the prop type so callers don't change shape, but
  // not consumed here until the recall feature ships (Phase R-recall).
}: {
  q: HeroQuestion;
  signedIn: boolean;
  initialStatus: Status;
  initialAction: Action;
  skips: { used: number; allowance: number; period: "week" | "day" };
  freeze: { available: number };
  recallCadence: "monthly" | "weekly" | "daily";
  rationale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status] = useState<Status>(initialStatus);
  const [action, setAction] = useState<Action>(initialAction);
  const [skipsLeft, setSkipsLeft] = useState(
    skips.allowance >= 9999 ? 9999 : Math.max(0, skips.allowance - skips.used),
  );
  const [freezeLeft, setFreezeLeft] = useState(freeze.available);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, start] = useTransition();
  const [upgrade, setUpgrade] = useState<UpgradeTrigger | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const solved = status === "solved";
  const protectedToday = action === "skipped" || action === "frozen";
  const locked = solved || protectedToday;

  function doSkip() {
    setSheet(null);
    if (skipsLeft <= 0) { setUpgrade("dsa_skip_exhausted"); return; }
    const prevAction = action, prevSkips = skipsLeft;
    setAction("skipped");
    setSkipsLeft((n) => Math.max(0, n - 1));
    setBanner("Skipped — your streak is protected.");
    start(async () => {
      const r = await skipTodayAction(q.slug);
      if (!r.ok) {
        setAction(prevAction);
        setSkipsLeft(prevSkips);
        setBanner(null);
        setUpgrade("dsa_skip_exhausted");
        return;
      }
      router.refresh();
    });
  }

  function doFreeze() {
    setSheet(null);
    if (freezeLeft <= 0) { setUpgrade("dsa_freeze_exhausted"); return; }
    const prevAction = action, prevFreeze = freezeLeft;
    setAction("frozen");
    setFreezeLeft((n) => Math.max(0, n - 1));
    setBanner("Streak frozen — safe for today.");
    start(async () => {
      const r = await freezeTodayAction(q.slug);
      if (!r.ok) {
        setAction(prevAction);
        setFreezeLeft(prevFreeze);
        setBanner(null);
        setUpgrade("dsa_freeze_exhausted");
        return;
      }
      router.refresh();
    });
  }

  const accent =
    solved ? "before:bg-success"
      : action === "frozen" ? "before:bg-sky-400"
      : action === "skipped" ? "before:bg-muted-foreground"
      : status === "in_progress" ? "before:bg-warning"
      : "";

  const statusLabel =
    solved ? { text: "Solved today", cls: "text-success", icon: <CheckCircle2 className="h-4 w-4" /> }
      : action === "frozen" ? { text: "Streak frozen", cls: "text-sky-500", icon: <Snowflake className="h-4 w-4" /> }
      : action === "skipped" ? { text: "Skipped today", cls: "text-muted-foreground", icon: <CornerUpRight className="h-4 w-4" /> }
      : status === "in_progress" ? { text: "In progress", cls: "text-warning", icon: null }
      : null;

  const ctaLabel =
    !signedIn ? "Start today's question"
      : protectedToday ? "Read today's question anyway"
      : status === "not_started" ? "Start today's question"
      : status === "in_progress" ? "Resume today's question"
      : "Review today's question";

  return (
    <div className="space-y-3">
      {/* Hero */}
      <section
        className={`surface-elevated relative overflow-hidden rounded-2xl ${
          accent ? `before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[''] ${accent}` : ""
        }`}
      >
        <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-5 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-4 w-4" /> Today&apos;s question
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Clock3 className="h-3.5 w-3.5" /> ~{q.minutes} min
            </span>
          </div>

          {statusLabel && (
            <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${statusLabel.cls}`}>
              {statusLabel.icon}{statusLabel.text}
            </p>
          )}

          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">{q.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{q.framing}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DifficultyPill d={q.difficulty} />
            <Pill>{patternLabel(q.pattern)}</Pill>
            <Pill>{BUCKET_LABEL[q.bucket]}</Pill>
          </div>
        </div>

        <div className="mx-5 mt-4 rounded-xl bg-primary-soft px-3.5 py-3 sm:mx-6">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-primary-soft-foreground">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{rationale}</span>
          </p>
        </div>

        <div className="p-5 pt-4 sm:p-6">
          <Link
            href={`/dsa/${q.slug}`}
            className="press tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>

          {banner && (
            <p
              role="status"
              aria-live="polite"
              className="animate-fade-up mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-success"
            >
              <Check className="h-3.5 w-3.5" /> {banner}
            </p>
          )}
          {(solved || protectedToday) && <NextRefreshCountdown className="mt-2 text-center" />}
        </div>
      </section>

      {/* Utilities (signed in) */}
      {signedIn ? (
        <div className="grid grid-cols-3 gap-2">
          <UtilityButton
            icon={<CornerUpRight className="h-4 w-4" />}
            label="Skip"
            sub={skips.allowance >= 9999 ? "Unlimited" : `${skipsLeft} / ${skips.period}`}
            disabled={locked}
            onClick={() => (skipsLeft > 0 ? setSheet("skip") : setUpgrade("dsa_skip_exhausted"))}
          />
          <UtilityButton
            icon={<Snowflake className="h-4 w-4" />}
            label="Freeze"
            sub={`${freezeLeft} token${freezeLeft === 1 ? "" : "s"}`}
            disabled={locked}
            onClick={() => (freezeLeft > 0 ? setSheet("freeze") : setUpgrade("dsa_freeze_exhausted"))}
          />
          {/* Recall is intentionally hidden until the recall flow ships
              (Phase R-recall). The previous button opened a sheet that did
              nothing on confirm — confusing UX. The plan-tier cadence is
              still tracked via recallCadence for when it lands. */}
        </div>
      ) : (
        <Link
          href="/auth/login?next=/dsa"
          className="press tap-target flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3 text-center text-xs font-semibold transition hover:border-primary/40 focus-ring"
        >
          Sign in to start a streak & unlock daily picks <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {/* Sheets */}
      {sheet === "skip" && (
        <ConfirmSheet
          title="Skip today's question?"
          body={`Your streak stays protected. You have ${skipsLeft} skip${skipsLeft === 1 ? "" : "s"} left this ${skips.period}.`}
          confirmLabel="Skip today"
          pending={pending}
          onConfirm={doSkip}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "freeze" && (
        <ConfirmSheet
          title="Use a streak freeze?"
          body={`This keeps your streak alive today without breaking it. You have ${freezeLeft} freeze token${freezeLeft === 1 ? "" : "s"}.`}
          confirmLabel="Use 1 freeze"
          pending={pending}
          onConfirm={doFreeze}
          onClose={() => setSheet(null)}
        />
      )}
      <UpgradeModal
        open={upgrade !== null}
        onClose={() => setUpgrade(null)}
        trigger={upgrade ?? "generic"}
        returnTo={pathname ?? "/dsa"}
      />
    </div>
  );
}

function UtilityButton({
  icon, label, sub, onClick, disabled = false,
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
      className="press tap-target flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-2 py-3 text-center transition hover:border-primary/40 disabled:opacity-45 focus-ring"
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
  title, body, confirmLabel, pending, onConfirm, onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape closes; also lock body scroll while the sheet is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the primary CTA on open so keyboard users land on the action,
    // not the close button (which is the first focusable element in source order).
    confirmRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

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
          <button type="button" onClick={onClose} aria-label="Close" className="tap-target-sm rounded-full p-1 text-muted-foreground hover:bg-secondary">
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
            ref={confirmRef}
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
