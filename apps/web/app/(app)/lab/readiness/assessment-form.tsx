"use client";

// Mobile-first 12-question quiz for the Readiness Mirror.
//
// One question per visible block, big tap targets, segmented controls for
// multi-choice + 5-point scales. Sticky submit at the bottom on mobile.
// After submit, renders the 4-score result + actions in-place without a
// navigation jump.

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, RefreshCcw, AlertTriangle, Brain, Layers, BookOpen, Wrench } from "lucide-react";
import { ReadinessMeter } from "../readiness-meter";
import { submitReadinessAssessmentAction } from "../actions";
import type { ReadinessAssessment, ReadinessScores } from "@/lib/llm/prompts/interview-readiness";

const ROLE_FUNCTIONS = [
  "qa_sdet", "backend", "frontend", "fullstack",
  "data_engineering", "ml_ai", "devops_platform", "mobile",
  "engineering_management", "product_management", "design", "security",
] as const;

interface PriorResult {
  dsa_score: number;
  system_design_score: number;
  behavioral_score: number;
  domain_score: number;
  actions: Array<{ dimension: string; headline: string; why: string; estimated_lift: number }>;
  updated_at: string;
}

interface Props {
  defaultRoleFunction: string;
  priorAnswers: Record<string, unknown> | null;
  priorResult: PriorResult | null;
}

export function ReadinessAssessmentForm({ defaultRoleFunction, priorAnswers, priorResult }: Props) {
  const initial = useMemo<ReadinessAssessment>(() => {
    const fromPrior = (key: keyof ReadinessAssessment) => priorAnswers?.[key as string];
    return {
      dsa_last_solved:       (fromPrior("dsa_last_solved") as ReadinessAssessment["dsa_last_solved"]) ?? "this_month",
      dsa_arrays_hashing:    (fromPrior("dsa_arrays_hashing") as 1|2|3|4|5) ?? 3,
      dsa_trees_graphs:      (fromPrior("dsa_trees_graphs") as 1|2|3|4|5) ?? 3,
      dsa_dp_advanced:       (fromPrior("dsa_dp_advanced") as 1|2|3|4|5) ?? 2,
      sd_high_scale:         (fromPrior("sd_high_scale") as ReadinessAssessment["sd_high_scale"]) ?? "unsure",
      sd_owned_service:      (fromPrior("sd_owned_service") as ReadinessAssessment["sd_owned_service"]) ?? "one",
      sd_cap_theorem:        (fromPrior("sd_cap_theorem") as ReadinessAssessment["sd_cap_theorem"]) ?? "kind_of",
      beh_recent:            (fromPrior("beh_recent") as ReadinessAssessment["beh_recent"]) ?? "no",
      beh_failure:           (fromPrior("beh_failure") as ReadinessAssessment["beh_failure"]) ?? "kind_of",
      domain_microservices:  (fromPrior("domain_microservices") as 1|2|3|4|5) ?? 3,
      years_experience:      Number(fromPrior("years_experience") ?? 4),
      target_role_function:  String(fromPrior("target_role_function") ?? defaultRoleFunction),
    };
  }, [priorAnswers, defaultRoleFunction]);

  const [a, setA] = useState<ReadinessAssessment>(initial);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReadinessScores | null>(
    priorResult
      ? {
          dsa_score: priorResult.dsa_score,
          system_design_score: priorResult.system_design_score,
          behavioral_score: priorResult.behavioral_score,
          domain_score: priorResult.domain_score,
          actions: priorResult.actions as ReadinessScores["actions"],
          is_fallback: false,
        }
      : null,
  );
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitReadinessAssessmentAction(a);
      if (res.ok && res.data) {
        setResult(res.data);
        setFlash({ kind: "ok", text: "Scored. Scroll to see your dimensions." });
        // Mobile UX: jump to results.
        if (typeof window !== "undefined") {
          setTimeout(() => {
            const el = document.getElementById("readiness-result");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      } else {
        setFlash({ kind: "err", text: res.error ?? "Could not score. Try again." });
      }
    });
  }

  return (
    <div className="space-y-4">
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

      <Section icon={<Brain className="h-4 w-4" />} title="DSA">
        <Choice
          label="When did you last solve a DSA problem?"
          value={a.dsa_last_solved}
          options={[
            { value: "today",            label: "Today" },
            { value: "this_week",        label: "This week" },
            { value: "this_month",       label: "This month" },
            { value: "six_months_plus",  label: "6+ months ago" },
            { value: "never",            label: "Never" },
          ]}
          onChange={(v) => setA({ ...a, dsa_last_solved: v as ReadinessAssessment["dsa_last_solved"] })}
        />
        <Scale
          label="Comfort: arrays / strings / hash tables"
          value={a.dsa_arrays_hashing}
          onChange={(v) => setA({ ...a, dsa_arrays_hashing: v as 1|2|3|4|5 })}
        />
        <Scale
          label="Comfort: trees / graphs / recursion"
          value={a.dsa_trees_graphs}
          onChange={(v) => setA({ ...a, dsa_trees_graphs: v as 1|2|3|4|5 })}
        />
        <Scale
          label="Comfort: DP / advanced patterns"
          value={a.dsa_dp_advanced}
          onChange={(v) => setA({ ...a, dsa_dp_advanced: v as 1|2|3|4|5 })}
        />
      </Section>

      <Section icon={<Layers className="h-4 w-4" />} title="System Design">
        <Choice
          label="Have you operated a service at >100k QPS?"
          value={a.sd_high_scale}
          options={[
            { value: "yes",    label: "Yes" },
            { value: "no",     label: "No" },
            { value: "unsure", label: "Not sure" },
          ]}
          onChange={(v) => setA({ ...a, sd_high_scale: v as ReadinessAssessment["sd_high_scale"] })}
        />
        <Choice
          label="Owned a service end-to-end in production?"
          value={a.sd_owned_service}
          options={[
            { value: "multiple", label: "Multiple" },
            { value: "one",      label: "One" },
            { value: "none",     label: "None" },
          ]}
          onChange={(v) => setA({ ...a, sd_owned_service: v as ReadinessAssessment["sd_owned_service"] })}
        />
        <Choice
          label="Can you explain CAP theorem to a non-engineer?"
          value={a.sd_cap_theorem}
          options={[
            { value: "yes",     label: "Yes" },
            { value: "kind_of", label: "Kind of" },
            { value: "no",      label: "No" },
          ]}
          onChange={(v) => setA({ ...a, sd_cap_theorem: v as ReadinessAssessment["sd_cap_theorem"] })}
        />
      </Section>

      <Section icon={<BookOpen className="h-4 w-4" />} title="Behavioral">
        <Choice
          label="Did you give a behavioral interview in the last year?"
          value={a.beh_recent}
          options={[
            { value: "yes",      label: "Yes" },
            { value: "planning", label: "Planning to" },
            { value: "no",       label: "No" },
          ]}
          onChange={(v) => setA({ ...a, beh_recent: v as ReadinessAssessment["beh_recent"] })}
        />
        <Choice
          label="Comfortable describing failure stories?"
          value={a.beh_failure}
          options={[
            { value: "yes",     label: "Yes" },
            { value: "kind_of", label: "Kind of" },
            { value: "no",      label: "No" },
          ]}
          onChange={(v) => setA({ ...a, beh_failure: v as ReadinessAssessment["beh_failure"] })}
        />
      </Section>

      <Section icon={<Wrench className="h-4 w-4" />} title="Domain">
        <Scale
          label="Microservices trade-offs comfort"
          value={a.domain_microservices}
          onChange={(v) => setA({ ...a, domain_microservices: v as 1|2|3|4|5 })}
        />
        <NumberField
          label="Years of professional engineering experience"
          value={a.years_experience}
          min={0}
          max={30}
          onChange={(v) => setA({ ...a, years_experience: v })}
        />
        <RoleFunctionPicker
          value={a.target_role_function}
          onChange={(v) => setA({ ...a, target_role_function: v })}
        />
      </Section>

      <div className="sticky bottom-3 z-10 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 lg:w-auto"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <RefreshCcw className="h-4 w-4" />}
          Score me
        </button>
      </div>

      {result && (
        <section id="readiness-result" className="space-y-3 pt-4">
          <header className="space-y-1">
            <h2 className="text-sm font-semibold">Your readiness</h2>
            {result.is_fallback && (
              <p className="text-[11px] text-amber-300">
                LLM was busy — these scores came from a deterministic estimate. Re-run later for a finer score.
              </p>
            )}
          </header>
          <ReadinessMeter
            dsa={result.dsa_score}
            systemDesign={result.system_design_score}
            behavioral={result.behavioral_score}
            domain={result.domain_score}
          />
          {result.actions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-3 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Lift +10 this week
              </p>
              <ul className="space-y-2">
                {result.actions.map((act, i) => (
                  <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                    <p className="text-sm font-medium">{act.headline}</p>
                    <p className="text-[11px] text-muted-foreground">{act.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Form atoms ────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </section>
  );
}

function Choice<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none ${
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-card"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Scale({ label, value, onChange }: {
  label: string; value: 1|2|3|4|5; onChange: (v: 1|2|3|4|5) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{toneLabel(value)}</p>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v as 1|2|3|4|5)}
              className={`rounded-md border py-2 text-xs font-semibold transition-colors motion-reduce:transition-none ${
                active
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-card"
              }`}
              aria-label={`${label}: ${v}`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toneLabel(v: 1|2|3|4|5): string {
  return ["", "shaky", "rusty", "OK", "solid", "strong"][v];
}

function NumberField({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function RoleFunctionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Target role function</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {ROLE_FUNCTIONS.map((rf) => (
          <option key={rf} value={rf}>{rf.replaceAll("_", " ")}</option>
        ))}
      </select>
    </label>
  );
}
