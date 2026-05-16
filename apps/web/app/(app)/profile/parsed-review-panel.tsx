"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Edit3, Sparkles } from "lucide-react";

// Sprint 2 — Item 7. Trust-building review of the LLM's parse.
//
// Surfaces the fields downstream matching actually reads — role function,
// target functions, years, skills, preferred hubs — so the user can verify
// at a glance and edit anything that's wrong. Reduces the "AI hallucinated
// my profile" trust gap without forcing a two-step upload flow.

type Props = {
  roleFunction: string | null;
  targetRoleFunctions: string[];
  yearsExperience: number | null;
  techStack: string[];
  preferredHubs: string[];
  /** href to focus the editable form — defaults to the on-page anchor. */
  editHref?: string;
};

const ROLE_FUNCTION_LABELS: Record<string, string> = {
  qa_sdet:                "QA / SDET",
  backend:                "Backend",
  frontend:               "Frontend",
  fullstack:              "Full-stack",
  data_engineering:       "Data engineering",
  ml_ai:                  "ML / AI",
  devops_platform:        "DevOps / platform",
  mobile:                 "Mobile",
  engineering_management: "Engineering management",
  product_management:     "Product management",
  design:                 "Design",
  security:               "Security",
  other:                  "Other",
};

function isLikelyWrong(props: Props): string[] {
  const issues: string[] = [];
  if (!props.roleFunction || props.roleFunction === "other") {
    issues.push("Current role function couldn't be inferred confidently.");
  }
  if (props.targetRoleFunctions.length === 0) {
    issues.push("No target role functions set — matching can't prioritise.");
  }
  if (props.yearsExperience === null || props.yearsExperience <= 0) {
    issues.push("Years of experience read as zero. Check the form below if you've shipped paid work.");
  }
  if (props.techStack.length < 3) {
    issues.push("Fewer than 3 skills detected. Add the stacks you want to be matched against.");
  }
  if (props.preferredHubs.length === 0) {
    issues.push("No India hubs selected — every Indian role will match equally on location.");
  }
  return issues;
}

export function ParsedReviewPanel(props: Props) {
  const [dismissed, setDismissed] = useState(false);
  const issues = isLikelyWrong(props);
  const editHref = props.editHref ?? "#profile-edit";

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Extracted from your resume</p>
            <p className="text-xs text-muted-foreground">Review what matching will use — edit anything that doesn&apos;t look right.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Looks right
        </button>
      </div>

      <ul className="divide-y divide-border/40">
        <ReviewRow
          label="Current role function"
          value={props.roleFunction ? (ROLE_FUNCTION_LABELS[props.roleFunction] ?? props.roleFunction) : "Not inferred"}
          editHref={editHref}
          missing={!props.roleFunction || props.roleFunction === "other"}
        />
        <ReviewRow
          label="Target role functions"
          value={props.targetRoleFunctions.length
            ? props.targetRoleFunctions.map((f) => ROLE_FUNCTION_LABELS[f] ?? f).join(" · ")
            : "None set"}
          editHref={editHref}
          missing={props.targetRoleFunctions.length === 0}
        />
        <ReviewRow
          label="Years of experience"
          value={props.yearsExperience != null ? `${props.yearsExperience} yrs` : "Not detected"}
          editHref={editHref}
          missing={props.yearsExperience === null || props.yearsExperience <= 0}
        />
        <ReviewRow
          label="Detected skills"
          value={
            props.techStack.length > 0
              ? <span className="flex flex-wrap gap-1">{props.techStack.slice(0, 12).map((t) => (
                  <span key={t} className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px]">{t}</span>
                ))}{props.techStack.length > 12 && <span className="text-xs text-muted-foreground/70">+{props.techStack.length - 12} more</span>}</span>
              : "None detected"
          }
          editHref={editHref}
          missing={props.techStack.length < 3}
        />
        <ReviewRow
          label="Preferred India hubs"
          value={props.preferredHubs.length ? props.preferredHubs.join(" · ") : "None selected"}
          editHref={editHref}
          missing={props.preferredHubs.length === 0}
        />
      </ul>

      {issues.length > 0 && (
        <div className="space-y-1.5 border-t border-amber-500/20 bg-amber-500/5 px-5 py-3">
          {issues.map((issue) => (
            <div key={issue} className="flex items-start gap-2 text-xs text-amber-300/90">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  label, value, editHref, missing,
}: {
  label: string; value: React.ReactNode; editHref: string; missing: boolean;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`mt-0.5 text-sm ${missing ? "text-amber-300/90" : "text-foreground"}`}>{value}</div>
      </div>
      <a
        href={editHref}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      >
        <Edit3 className="h-3 w-3" />
        Edit
      </a>
    </li>
  );
}
