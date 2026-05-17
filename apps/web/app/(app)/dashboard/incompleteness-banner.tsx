// Sprint 6 — Profile + DPDP gate banner.
//
// Surfaces incomplete profile fields that materially hurt match quality, plus
// the DPDP matching-consent gate. Renders nothing when there's nothing
// missing.
//
// What we DON'T check anymore (per user feedback):
//   - seniority      — years_experience already captures the signal
//   - target_lpa     — 95% of product-co JDs don't post comp bands; the
//                      dim would default to 1/2 on every match. Removed
//                      from rubric entirely.

import Link from "next/link";
import { AlertCircle, ChevronRight, ShieldCheck } from "lucide-react";

export interface IncompletenessInputs {
  preferredHubsCount: number;
  hasResume: boolean;
  matchingConsentGranted: boolean;
  techStackCount: number;
}

export function detectIncompleteness(inputs: IncompletenessInputs): Array<{
  key: string;
  label: string;
  href: string;
  estLift: string;
  severity: "critical" | "moderate";
}> {
  const issues: ReturnType<typeof detectIncompleteness> = [];

  if (!inputs.matchingConsentGranted) {
    issues.push({
      key: "consent",
      label: "Grant matching consent (DPDP Act 2023)",
      href: "/settings/privacy",
      estLift: "required — we can't generate match explanations without it",
      severity: "critical",
    });
  }

  if (!inputs.hasResume) {
    issues.push({
      key: "resume",
      label: "Upload your resume",
      href: "/profile",
      estLift: "needed to compute any matches",
      severity: "critical",
    });
  }

  if (inputs.preferredHubsCount === 0) {
    issues.push({
      key: "hubs",
      label: "Set your preferred hubs",
      href: "/profile",
      estLift: "lifts location-fit dim by +5 across all matches",
      severity: "moderate",
    });
  }

  if (inputs.techStackCount < 5) {
    issues.push({
      key: "tech",
      label: "Confirm your tech stack",
      href: "/profile",
      estLift: "tech-fit dim defaults to a low partial-credit baseline without it",
      severity: "moderate",
    });
  }

  return issues;
}

export function IncompletenessBanner({
  issues,
}: {
  issues: ReturnType<typeof detectIncompleteness>;
}) {
  if (issues.length === 0) return null;
  const hasCritical = issues.some((i) => i.severity === "critical");

  // One critical issue = dedicated full-width card (DPDP / missing resume).
  // Otherwise: compact aggregate banner that expands to the list.
  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        hasCritical
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/30 bg-warning/5"
      }`}
      role={hasCritical ? "alert" : undefined}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          hasCritical
            ? "bg-destructive text-destructive-foreground"
            : "bg-warning text-warning-foreground"
        }`}>
          {hasCritical ? <ShieldCheck className="h-4 w-4" strokeWidth={2.25} /> : <AlertCircle className="h-4 w-4" strokeWidth={2.25} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${hasCritical ? "text-destructive" : "text-warning"}`}>
            {hasCritical
              ? "Finish setup to unlock match explanations"
              : `${issues.length} ${issues.length === 1 ? "item" : "items"} would improve your matches`}
          </p>
          <ul className="mt-2.5 space-y-2">
            {issues.map((issue) => (
              <li key={issue.key}>
                <Link
                  href={issue.href}
                  className="group flex items-start gap-2 rounded-md px-1 py-1 -mx-1 transition hover:bg-background/50 focus-ring"
                >
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{issue.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{issue.estLift}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
