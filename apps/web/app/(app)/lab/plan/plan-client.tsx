"use client";

// Mobile-first Study Plan client. Two modes:
//   - "no plan" → setup form (weeks + target companies)
//   - "has plan" → today's tasks + week tabs + day expand-on-tap
//
// Day check-off is optimistic with rollback on failure.

import { useMemo, useState, useTransition } from "react";
import {
  Calendar, Loader2, Sparkles, CheckCircle2, AlertTriangle, Wrench,
  Brain, BookOpen, Layers, Coffee, FileText, MessageCircle, ChevronDown,
} from "lucide-react";
import { generatePlanAction, checkOffDayAction } from "../phase3-actions";
import { CRAWLER_META, type CrawlerMeta } from "@prodmatch/shared";
import type { StudyPlan, StudyTask, StudyTaskKind } from "@/lib/llm/prompts/interview-study-plan";

export interface DayProgressRow {
  day: string;
  dsa_done: boolean;
  story_rehearsed: boolean;
  system_design_done: boolean;
  mock_done: boolean;
  notes: string | null;
}

interface Props {
  existing: {
    weeks: number;
    target_companies: string[];
    target_role_function: string | null;
    plan: StudyPlan;
    start_date: string;
    generated_at: string;
  } | null;
  progress: DayProgressRow[];
}

const TASK_ICON: Record<StudyTaskKind, React.ComponentType<{ className?: string }>> = {
  dsa:               Brain,
  system_design:     Layers,
  story_rehearsal:   BookOpen,
  mock_interview:    MessageCircle,
  cheatsheet_read:   FileText,
  rest:              Coffee,
  project_translate: Wrench,
};

export function PlanClient({ existing, progress }: Props) {
  if (!existing) return <PlanSetup />;
  return <PlanView plan={existing.plan} startDate={existing.start_date} progress={progress} weeks={existing.weeks} targetCompanies={existing.target_companies} />;
}

// ── Setup ──────────────────────────────────────────────────────────────────

function PlanSetup() {
  const [weeks, setWeeks] = useState<4 | 6 | 8 | 12>(6);
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const presets = CRAWLER_META as readonly CrawlerMeta[];

  function toggle(slug: string) {
    setCompanies((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < 6) next.add(slug);
      return next;
    });
  }

  function handleGenerate() {
    setFlash(null);
    startTransition(async () => {
      const res = await generatePlanAction({
        weeks,
        target_companies: Array.from(companies),
      });
      if (res.ok) {
        if (typeof window !== "undefined") window.location.reload();
      } else {
        setFlash(res.error ?? "Could not generate plan.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Plan length
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[4, 6, 8, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWeeks(n as 4 | 6 | 8 | 12)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none ${
                weeks === n
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-card"
              }`}
            >
              {n} weeks
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" /> Target companies <span className="text-[11px] font-normal text-muted-foreground">(pick up to 6)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((c) => {
            const active = companies.has(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggle(c.slug)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-card"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </section>

      {flash && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />{flash}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-4 w-4" />}
        Generate my study plan
      </button>
    </div>
  );
}

// ── View ───────────────────────────────────────────────────────────────────

function PlanView({ plan, startDate, progress, weeks, targetCompanies }: {
  plan: StudyPlan;
  startDate: string;
  progress: DayProgressRow[];
  weeks: number;
  targetCompanies: string[];
}) {
  const [activeWeek, setActiveWeek] = useState<number>(() => {
    const elapsedDays = Math.floor((Date.now() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000));
    const wk = Math.min(weeks, Math.max(1, Math.floor(elapsedDays / 7) + 1));
    return wk;
  });

  const progressByDay = useMemo(() => {
    const m = new Map<string, DayProgressRow>();
    for (const p of progress) m.set(p.day, p);
    return m;
  }, [progress]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const start = new Date(startDate);

  return (
    <div className="space-y-3">
      {plan.is_fallback && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          LLM was busy when this plan was built. It&apos;s a deterministic fallback —
          re-generate later for a sharper, more resume-personalised version.
        </div>
      )}

      {plan.overview && (
        <section className="rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm leading-relaxed">{plan.overview}</p>
          {plan.daily_principles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.daily_principles.map((p, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">• {p}</li>
              ))}
            </ul>
          )}
          {targetCompanies.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anchored to: {targetCompanies.join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Week pills */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {plan.weeks.map((w) => (
          <button
            key={w.week_index}
            type="button"
            onClick={() => setActiveWeek(w.week_index)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
              activeWeek === w.week_index
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            W{w.week_index} · {w.theme.slice(0, 24)}
          </button>
        ))}
      </div>

      {/* Active week days */}
      <div className="space-y-2">
        {plan.weeks.find((w) => w.week_index === activeWeek)?.days.map((day) => {
          const date = new Date(start);
          date.setDate(start.getDate() + day.day_index - 1);
          const dateIso = date.toISOString().slice(0, 10);
          const isToday = dateIso === todayIso;
          const prog = progressByDay.get(dateIso);
          return (
            <DayCard
              key={day.day_index}
              dayIndex={day.day_index}
              weekday={day.weekday}
              dateIso={dateIso}
              dateLabel={date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              focus={day.focus}
              tasks={day.tasks}
              isToday={isToday}
              progress={prog}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCard({ dayIndex, weekday, dateIso, dateLabel, focus, tasks, isToday, progress }: {
  dayIndex: number;
  weekday: string;
  dateIso: string;
  dateLabel: string;
  focus: string;
  tasks: StudyTask[];
  isToday: boolean;
  progress: DayProgressRow | undefined;
}) {
  const [open, setOpen] = useState(isToday);
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState({
    dsa_done:           progress?.dsa_done ?? false,
    story_rehearsed:    progress?.story_rehearsed ?? false,
    system_design_done: progress?.system_design_done ?? false,
    mock_done:          progress?.mock_done ?? false,
    notes:              progress?.notes ?? "",
  });

  function toggleField(field: keyof typeof local) {
    if (field === "notes") return;
    const prev = local[field] as boolean;
    const next = !prev;
    setLocal((s) => ({ ...s, [field]: next }));
    startTransition(async () => {
      const res = await checkOffDayAction({
        day: dateIso,
        dsa_done:           field === "dsa_done"           ? next : (local.dsa_done as boolean),
        story_rehearsed:    field === "story_rehearsed"    ? next : (local.story_rehearsed as boolean),
        system_design_done: field === "system_design_done" ? next : (local.system_design_done as boolean),
        mock_done:          field === "mock_done"          ? next : (local.mock_done as boolean),
        notes:              local.notes as string,
      });
      if (!res.ok) {
        setLocal((s) => ({ ...s, [field]: prev })); // revert
      }
    });
  }

  const tickCount = [local.dsa_done, local.story_rehearsed, local.system_design_done, local.mock_done].filter(Boolean).length;

  return (
    <article className={`overflow-hidden rounded-2xl border ${isToday ? "border-primary/40" : "border-border"} bg-card/40`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card/60"
      >
        <span className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold ${
          isToday ? "bg-primary/15 text-primary" : "bg-secondary text-foreground"
        }`}>
          <span className="text-[9px] uppercase tracking-wider">{weekday}</span>
          <span className="text-base leading-none tabular-nums">D{dayIndex}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{dateLabel}{isToday && <span className="ml-1.5 text-[10px] font-semibold text-primary">TODAY</span>}</p>
          <p className="truncate text-[11px] text-muted-foreground">{focus}</p>
        </div>
        {tickCount > 0 && (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            {tickCount}/{tasks.length || 4} done
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border/50 px-4 py-4 space-y-3">
          {tasks.map((t, i) => (
            <TaskRow key={i} task={t} />
          ))}
          <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Daily check-off</p>
            <div className="grid grid-cols-2 gap-2">
              <CheckRow label="DSA"             checked={local.dsa_done}           onToggle={() => toggleField("dsa_done")} disabled={pending} />
              <CheckRow label="Story rehearsed" checked={local.story_rehearsed}    onToggle={() => toggleField("story_rehearsed")} disabled={pending} />
              <CheckRow label="System design"   checked={local.system_design_done} onToggle={() => toggleField("system_design_done")} disabled={pending} />
              <CheckRow label="Mock interview"  checked={local.mock_done}          onToggle={() => toggleField("mock_done")} disabled={pending} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function TaskRow({ task }: { task: StudyTask }) {
  const Icon = TASK_ICON[task.kind] ?? Sparkles;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/40 p-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{task.headline}</p>
        {task.why && <p className="text-[11px] text-muted-foreground">{task.why}</p>}
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{task.estimated_minutes}m</span>
    </div>
  );
}

function CheckRow({ label, checked, onToggle, disabled }: {
  label: string; checked: boolean; onToggle: () => void; disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors motion-reduce:transition-none ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-border bg-background/40 text-muted-foreground hover:bg-card"
      } disabled:opacity-60`}
    >
      {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="inline-block h-3.5 w-3.5 rounded-sm border border-current" />}
      {label}
    </button>
  );
}
