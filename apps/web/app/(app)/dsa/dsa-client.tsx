"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  Flame,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import {
  DSA_PATTERN_ROADMAP,
  DSA_PATTERNS_DISPLAY,
  getDsaLearningGuide,
  getDsaPatternProgress,
  getDsaProblemBySlug,
  type DsaProblem,
  type DsaDifficulty,
  type DsaPattern,
} from "@prodmatch/shared";
import { completeDsaAction, getTodayDispatchAction } from "./actions";
import { cn } from "@/lib/utils";

type TodayDispatch = {
  problem: DsaProblem;
  personalised_note: string;
  what_youll_learn: string[];
  is_complete: boolean;
};

export interface DsaHistoryRow {
  day: string;
  problem_slug: string;
  personalised_note: string | null;
  is_complete: boolean;
}

interface Props {
  history: DsaHistoryRow[];
  hasResume: boolean;
}

export function DsaClient({ history, hasResume }: Props) {
  const [today, setToday] = useState<TodayDispatch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await getTodayDispatchAction();
        if (!res.ok) {
          setFlash({ kind: "err", text: res.error ?? "Could not pick today's problem." });
        } else {
          setToday(res.data);
        }
      } catch {
        setFlash({ kind: "err", text: "Could not pick today's problem. Please try again shortly." });
      } finally {
        setLoaded(true);
      }
    });
  }, []);

  const completedSlugs = useMemo(
    () => history.filter((row) => row.is_complete).map((row) => row.problem_slug),
    [history],
  );
  const progress = useMemo(() => getDsaPatternProgress(completedSlugs), [completedSlugs]);
  const streak = useMemo(() => computeStreak(history), [history]);
  const completedCount = completedSlugs.length;
  const todayGuide = today ? getDsaLearningGuide(today.problem) : null;
  const learnBullets = today?.what_youll_learn.length ? today.what_youll_learn : todayGuide?.approach.slice(0, 3) ?? [];

  function handleComplete() {
    if (!today) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      try {
        const res = await completeDsaAction({ day: todayIso });
        if (res.ok) {
          setToday((current) => (current ? { ...current, is_complete: true } : current));
          setFlash({ kind: "ok", text: "Done. Today's DSA streak is counted." });
        } else {
          setFlash({ kind: "err", text: res.error ?? "Could not mark complete." });
        }
      } catch {
        setFlash({ kind: "err", text: "Could not mark complete. Please try again." });
      }
    });
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            flash.kind === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          <span className="inline-flex items-center gap-2">
            {flash.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {flash.text}
          </span>
        </div>
      )}

      {!hasResume && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <span className="inline-flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You can start DSA now. Upload a resume later and ProdMatch will tune the daily problem around your target role.
            </span>
          </span>
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        {!loaded ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            Preparing today&apos;s problem
          </div>
        ) : today && todayGuide ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Brain className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Today
                  </span>
                  <DifficultyPill difficulty={today.problem.difficulty} />
                </div>
                <h2 className="mt-2 text-xl font-semibold leading-tight tracking-tight">{today.problem.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {DSA_PATTERNS_DISPLAY[today.problem.pattern]} · {todayGuide.estimatedMinutes} min
                </p>
              </div>
              {today.is_complete && <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Done" />}
            </div>

            {today.personalised_note && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 align-baseline text-primary" />
                {today.personalised_note}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Metric icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak}d`} />
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={String(completedCount)} />
              <Metric icon={<Target className="h-4 w-4" />} label="Pattern" value={shortPattern(today.problem.pattern)} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending || today.is_complete}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-4 w-4" />}
                {today.is_complete ? "Completed" : "Mark Done"}
              </button>
              <a
                href={today.problem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:flex-none"
              >
                <ExternalLink className="h-4 w-4" />
                Open on LeetCode
              </a>
            </div>

            <LessonSections guide={todayGuide} learnBullets={learnBullets} />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            No DSA problem is available right now. Try again later.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Pattern Roadmap</h2>
            <p className="text-xs text-muted-foreground">Foundational first, then graphs and DP.</p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
            {completedCount} solved
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {progress.slice(0, 9).map((item) => (
            <PatternProgress key={item.pattern} item={item} />
          ))}
        </div>
      </section>

      <RecentHistory history={history} />
    </div>
  );
}

function LessonSections({ guide, learnBullets }: { guide: ReturnType<typeof getDsaLearningGuide>; learnBullets: string[] }) {
  return (
    <div className="space-y-4 border-t border-border pt-4">
      <ContentBlock icon={<BookOpen className="h-4 w-4" />} title="Question">
        <p>{guide.prompt}</p>
        {guide.examples.length > 0 && (
          <div className="mt-2 space-y-1">
            {guide.examples.map((example) => (
              <p key={example} className="rounded-md bg-secondary/50 px-2 py-1 font-mono text-[12px] text-muted-foreground">
                {example}
              </p>
            ))}
          </div>
        )}
      </ContentBlock>

      <ContentBlock icon={<Target className="h-4 w-4" />} title="Approach">
        <OrderedLines lines={guide.approach} />
      </ContentBlock>

      <ContentBlock icon={<CheckCircle2 className="h-4 w-4" />} title="Clean Solution">
        <OrderedLines lines={guide.solution} />
        {guide.code && (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-secondary/50 p-3 text-[12px] leading-relaxed">
            <code>{guide.code}</code>
          </pre>
        )}
        <p className="mt-2 text-xs font-medium text-muted-foreground">{guide.complexity}</p>
      </ContentBlock>

      {learnBullets.length > 0 && (
        <ContentBlock icon={<Sparkles className="h-4 w-4" />} title="What This Builds">
          <ul className="space-y-1.5">
            {learnBullets.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </ContentBlock>
      )}
    </div>
  );
}

function ContentBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function OrderedLines({ lines }: { lines: string[] }) {
  return (
    <ol className="space-y-1.5">
      {lines.map((line, index) => (
        <li key={line} className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-l border-border pl-3 first:border-l-0 first:pl-0">
      <div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-sm font-semibold">{value}</span></div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function PatternProgress({ item }: { item: ReturnType<typeof getDsaPatternProgress>[number] }) {
  const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.focus}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{item.completed}/{item.total}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RecentHistory({ history }: { history: DsaHistoryRow[] }) {
  if (history.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Recent Problems</h2>
      <div className="space-y-2">
        {history.slice(0, 8).map((row) => {
          const problem = getDsaProblemBySlug(row.problem_slug);
          if (!problem) return null;
          return (
            <Link
              key={row.day}
              href={`/dsa/${problem.slug}`}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition hover:bg-secondary/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground tabular-nums">
                {row.day.slice(5)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{problem.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {DSA_PATTERNS_DISPLAY[problem.pattern]} · {problem.difficulty}
                </span>
              </span>
              {row.is_complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DifficultyPill({ difficulty }: { difficulty: DsaDifficulty }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        difficulty === "easy" && "bg-success/10 text-success",
        difficulty === "medium" && "bg-warning/10 text-warning",
        difficulty === "hard" && "bg-destructive/10 text-destructive",
      )}
    >
      {difficulty}
    </span>
  );
}

function shortPattern(pattern: DsaPattern): string {
  const item = DSA_PATTERN_ROADMAP.find((p) => p.pattern === pattern);
  if (!item) return "Core";
  return item.label.replace("Dynamic Programming", "DP").replace("Priority Queue", "PQ");
}

function computeStreak(history: DsaHistoryRow[]): number {
  const completed = new Set(history.filter((row) => row.is_complete).map((row) => row.day));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!completed.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
