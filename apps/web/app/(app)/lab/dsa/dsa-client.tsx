"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Brain, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Sparkles,
  RefreshCcw,
} from "lucide-react";
import { completeDsaAction, getTodayDispatchAction, type TodayDispatch } from "../phase3-actions";
import { DSA_PATTERNS_DISPLAY, getDsaProblemBySlug } from "@prodmatch/shared";

export interface HistoryRow {
  day: string;
  problem_slug: string;
  personalised_note: string | null;
  is_complete: boolean;
}

export function DsaClient({ history }: { history: HistoryRow[] }) {
  const [today, setToday] = useState<TodayDispatch | null>(null);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const res = await getTodayDispatchAction();
      if (res.ok && res.data) setToday(res.data);
      else if (!res.ok) setFlash({ kind: "err", text: res.error ?? "Could not fetch today's problem." });
      setLoaded(true);
    });
  }, []);

  function handleComplete() {
    if (!today) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      const res = await completeDsaAction({ day: todayIso });
      if (res.ok) {
        setToday((t) => (t ? { ...t, is_complete: true } : t));
        setFlash({ kind: "ok", text: "Nice — streak counted." });
      } else {
        setFlash({ kind: "err", text: res.error ?? "Could not mark complete." });
      }
    });
  }

  return (
    <div className="space-y-3">
      {flash && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${flash.kind === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
          <span className="inline-flex items-center gap-1.5">
            {flash.kind === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {flash.text}
          </span>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
        {!loaded ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Picking today&apos;s problem…
          </p>
        ) : today ? (
          <>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Brain className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today&apos;s problem</p>
                <p className="text-base font-semibold">{today.problem.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DSA_PATTERNS_DISPLAY[today.problem.pattern]} · {today.problem.difficulty}
                  {today.problem.companies.length > 0 && ` · asked at ${today.problem.companies.slice(0, 4).join(", ")}`}
                </p>
              </div>
              {today.is_complete && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-label="Done" />}
            </div>

            {today.personalised_note && (
              <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm leading-relaxed">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 align-baseline text-primary" />
                {today.personalised_note}
              </p>
            )}

            {today.what_youll_learn.length > 0 && (
              <ul className="space-y-1">
                {today.what_youll_learn.map((b, i) => (
                  <li key={i} className="text-[12px] text-muted-foreground">• {b}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={today.problem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Solve on LeetCode
              </a>
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending || today.is_complete}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {today.is_complete ? "Done" : "Mark complete"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No problem available — try again tomorrow.</p>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent history</p>
          <ul className="space-y-1.5">
            {history.map((h) => {
              const problem = getDsaProblemBySlug(h.problem_slug);
              return (
                <li
                  key={h.day}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-xs"
                >
                  <span className="shrink-0 text-muted-foreground tabular-nums">{h.day.slice(5)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {problem ? problem.title : h.problem_slug}
                  </span>
                  {h.is_complete && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                  {problem && (
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-[10px] text-muted-foreground">
        <RefreshCcw className="mr-1 inline h-3 w-3 align-baseline" />
        A new problem is picked each day. Recently-shown problems are skipped for 14 days.
      </p>
    </div>
  );
}
