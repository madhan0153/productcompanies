"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle, ShieldCheck, Wand2 } from "lucide-react";
import { diagnoseTailored } from "../tailor-actions";
import type { RewriteMode } from "@/lib/llm/prompts/bullet-rewrite";

interface Props {
  jobId: string;
  quotaUsed: number;
  quotaLimit: number;
  quotaExhausted: boolean;
  mustHaves: string[];
}

export function TailorEntry({ jobId, quotaUsed, quotaLimit, quotaExhausted, mustHaves }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<RewriteMode>("polish");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await diagnoseTailored(jobId, mode);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold sm:text-lg">Choose tailoring mode</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ModeCard
            id="polish"
            active={mode === "polish"}
            icon={<ShieldCheck className="h-4 w-4 text-success" aria-hidden />}
            title="Polish (recommended)"
            body="Minimal edits. Preserve your voice. Tighten verbs, surface implicit signal, fix passive voice. Safer; smaller ATS lift."
            onClick={() => setMode("polish")}
          />
          <ModeCard
            id="tailor"
            active={mode === "tailor"}
            icon={<Wand2 className="h-4 w-4 text-primary" aria-hidden />}
            title="Tailor"
            body="Aggressive JD-aligned rewrites. Surface must-have keywords (when implied by your bullet). Bigger ATS lift; more risk flags to review."
            onClick={() => setMode("tailor")}
          />
        </div>

        {mustHaves.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              JD must-haves driving the tailoring
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mustHaves.slice(0, 12).map((s) => (
                <span key={s} className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11px]">
                  {s}
                </span>
              ))}
              {mustHaves.length > 12 && (
                <span className="rounded-md border border-dashed border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{mustHaves.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          <p>
            Diagnosis runs Step 1 (weakness report) + Step 2 (per-bullet rewrites). Every change shows the original side-by-side. You approve, edit, or skip each one.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {quotaUsed} / {quotaLimit} tailored diagnoses used this 30-day window.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={pending || quotaExhausted}
            className="press tap-target inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Analysing your resume vs the JD…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Run tailored diagnosis
              </>
            )}
          </button>
        </div>

        {quotaExhausted && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>You&apos;ve used your monthly diagnoses. Window resets a few weeks from your first run.</p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  id, active, icon, title, body, onClick,
}: {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap-target press text-left rounded-lg border p-3.5 transition focus-ring ${
        active
          ? "border-primary/50 bg-primary-soft"
          : "border-border bg-card hover:border-foreground/30"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <p className="sr-only">Mode {id}</p>
    </button>
  );
}
