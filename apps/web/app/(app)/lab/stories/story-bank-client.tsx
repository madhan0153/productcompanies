"use client";

// Mobile-first Story Bank.
//
// - Card per story, collapsed by default
// - Tap to expand, edit-in-place
// - Save (no LLM) or Polish (LLM tightens prose) + Star + Delete
// - Filter by competency
// - Empty state: Generate button kicks off the LLM
//
// Privacy: this view talks to server actions only. No PII leaves the
// authenticated session boundary.

import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown, Loader2, Save, Star, Sparkles, Trash2,
  CheckCircle2, AlertTriangle, RefreshCcw,
} from "lucide-react";
import {
  deleteStoryAction,
  generateStoriesAction,
  polishStoryAction,
  saveStoryAction,
  starStoryAction,
} from "../actions";

export interface StoryRow {
  id: string;
  competency: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  source_company: string | null;
  source_role: string | null;
  suggested_questions: string[];
  is_starred: boolean;
  polished: boolean;
  updated_at: string;
}

const COMPETENCIES = [
  "leadership", "ownership", "conflict", "scope_change", "technical_depth",
  "business_impact", "failure_learning", "mentorship", "ambiguity", "cross_functional",
] as const;

type Competency = (typeof COMPETENCIES)[number];

const COMPETENCY_LABEL: Record<string, string> = {
  leadership:       "Leadership",
  ownership:        "Ownership",
  conflict:         "Conflict",
  scope_change:     "Scope change",
  technical_depth:  "Technical depth",
  business_impact:  "Business impact",
  failure_learning: "Failure / learning",
  mentorship:       "Mentorship",
  ambiguity:        "Ambiguity",
  cross_functional: "Cross-functional",
};

export function StoryBankClient({ initial }: { initial: StoryRow[] }) {
  const [stories, setStories] = useState<StoryRow[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Competency | "all">("all");
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [generatePending, startGenerate] = useTransition();

  const filtered = useMemo(
    () => stories.filter((s) => filter === "all" || s.competency === filter),
    [stories, filter],
  );

  function showFlash(kind: "ok" | "err", text: string) {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 3500);
  }

  function handleGenerate() {
    startGenerate(async () => {
      const res = await generateStoriesAction();
      if (res.ok && res.data) {
        showFlash("ok", `Generated ${res.data.count} stories. Refresh to see them.`);
        // Server-action revalidated /lab/stories; trigger client reload to pick up rows.
        if (typeof window !== "undefined") window.location.reload();
      } else {
        showFlash("err", res.error ?? "Could not generate.");
      }
    });
  }

  function updateLocal(updater: (s: StoryRow) => StoryRow, id: string) {
    setStories((curr) => curr.map((s) => (s.id === id ? updater(s) : s)));
  }

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of stories) c.set(s.competency, (c.get(s.competency) ?? 0) + 1);
    return c;
  }, [stories]);

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

      {/* Generate / regenerate */}
      <section className="rounded-2xl border border-border bg-card/40 p-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {stories.length === 0 ? "No stories yet." : `${stories.length} stories saved.`}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generatePending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {generatePending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-3.5 w-3.5" />}
          {stories.length === 0 ? "Generate stories" : "Regenerate"}
        </button>
      </section>

      {/* Filter chips */}
      {stories.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <FilterChip label={`All · ${stories.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
          {COMPETENCIES.map((c) => {
            const count = counts.get(c) ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={c}
                label={`${COMPETENCY_LABEL[c]} · ${count}`}
                active={filter === c}
                onClick={() => setFilter(c)}
              />
            );
          })}
        </div>
      )}

      {/* Stories */}
      {filtered.length === 0 && stories.length > 0 && (
        <p className="rounded-2xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
          No stories in this competency yet. Try a different filter, or regenerate.
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            isOpen={openId === s.id}
            onToggle={() => setOpenId((curr) => (curr === s.id ? null : s.id))}
            onLocalUpdate={(updater) => updateLocal(updater, s.id)}
            onRemove={() => setStories((curr) => curr.filter((x) => x.id !== s.id))}
            onFlash={showFlash}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ── Story Card ────────────────────────────────────────────────────────────

interface CardProps {
  story: StoryRow;
  isOpen: boolean;
  onToggle: () => void;
  onLocalUpdate: (updater: (s: StoryRow) => StoryRow) => void;
  onRemove: () => void;
  onFlash: (kind: "ok" | "err", text: string) => void;
}

function StoryCard({ story, isOpen, onToggle, onLocalUpdate, onRemove, onFlash }: CardProps) {
  const [draft, setDraft] = useState({
    competency:     story.competency as Competency,
    title:          story.title,
    situation:      story.situation,
    task:           story.task,
    action:         story.action,
    result:         story.result,
    source_company: story.source_company ?? "",
    source_role:    story.source_role ?? "",
  });
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await saveStoryAction(story.id, draft);
      if (res.ok) {
        onLocalUpdate((s) => ({ ...s, ...draft, polished: true, updated_at: new Date().toISOString() }));
        onFlash("ok", "Saved.");
      } else {
        onFlash("err", res.error ?? "Save failed.");
      }
    });
  }

  function handlePolish() {
    startTransition(async () => {
      const res = await polishStoryAction(story.id, draft);
      if (res.ok && res.data) {
        setDraft({
          competency:     res.data.competency,
          title:          res.data.title,
          situation:      res.data.situation,
          task:           res.data.task,
          action:         res.data.action,
          result:         res.data.result,
          source_company: res.data.source_company,
          source_role:    res.data.source_role,
        });
        onLocalUpdate((s) => ({
          ...s,
          competency:     res.data!.competency,
          title:          res.data!.title,
          situation:      res.data!.situation,
          task:           res.data!.task,
          action:         res.data!.action,
          result:         res.data!.result,
          source_company: res.data!.source_company,
          source_role:    res.data!.source_role,
          polished:       true,
          updated_at:     new Date().toISOString(),
        }));
        onFlash("ok", "Polished by AI.");
      } else {
        onFlash("err", res.error ?? "Polish failed.");
      }
    });
  }

  function handleStar() {
    const next = !story.is_starred;
    onLocalUpdate((s) => ({ ...s, is_starred: next }));
    startTransition(async () => {
      const res = await starStoryAction(story.id, next);
      if (!res.ok) {
        onLocalUpdate((s) => ({ ...s, is_starred: !next })); // revert
        onFlash("err", res.error ?? "Star failed.");
      }
    });
  }

  function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm("Delete this story?")) return;
    startTransition(async () => {
      const res = await deleteStoryAction(story.id);
      if (res.ok) onRemove();
      else onFlash("err", res.error ?? "Delete failed.");
    });
  }

  return (
    <article className={`overflow-hidden rounded-2xl border ${story.is_starred ? "border-primary/40" : "border-border"} bg-card/40`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-card/60 transition-colors motion-reduce:transition-none"
        aria-expanded={isOpen}
      >
        <CompetencyChip competency={story.competency} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{story.title || "(untitled)"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {story.source_role && story.source_company
              ? `${story.source_role} · ${story.source_company}`
              : "tap to expand"}
          </p>
        </div>
        {story.is_starred && <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />}
        {story.polished && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Polished" />}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="border-t border-border/50 px-4 py-4 space-y-3">
          <Field label="Title">
            <Input value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competency">
              <select
                value={draft.competency}
                onChange={(e) => setDraft({ ...draft, competency: e.target.value as Competency })}
                className={selectCls}
              >
                {COMPETENCIES.map((c) => (
                  <option key={c} value={c}>{COMPETENCY_LABEL[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Source company">
              <Input value={draft.source_company} onChange={(v) => setDraft({ ...draft, source_company: v })} />
            </Field>
          </div>
          <Field label="Source role">
            <Input value={draft.source_role} onChange={(v) => setDraft({ ...draft, source_role: v })} />
          </Field>
          <Field label="Situation">
            <Textarea value={draft.situation} onChange={(v) => setDraft({ ...draft, situation: v })} rows={3} />
          </Field>
          <Field label="Task">
            <Textarea value={draft.task} onChange={(v) => setDraft({ ...draft, task: v })} rows={2} />
          </Field>
          <Field label="Action">
            <Textarea value={draft.action} onChange={(v) => setDraft({ ...draft, action: v })} rows={5} />
          </Field>
          <Field label="Result">
            <Textarea value={draft.result} onChange={(v) => setDraft({ ...draft, result: v })} rows={2} />
          </Field>

          {story.suggested_questions.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Behavioral questions this answers</p>
              <ul className="space-y-1 text-xs">
                {story.suggested_questions.map((q, i) => (
                  <li key={i} className="text-muted-foreground">• {q}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={handlePolish}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Polish with AI
            </button>
            <button
              type="button"
              onClick={handleStar}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:bg-card"
            >
              <Star className={`h-3.5 w-3.5 ${story.is_starred ? "fill-primary text-primary" : ""}`} />
              {story.is_starred ? "Unstar" : "Star"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function CompetencyChip({ competency }: { competency: string }) {
  return (
    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
      {COMPETENCY_LABEL[competency] ?? competency.replaceAll("_", " ")}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const selectCls = inputCls;

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}

function Textarea({ value, onChange, rows }: { value: string; onChange: (v: string) => void; rows: number }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={`${inputCls} min-h-[60px]`} />;
}
