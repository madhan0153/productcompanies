// Interview Lab — landing page.
//
// Mobile-first dashboard. Shows the readiness meter (4 sub-scores), a
// Story Bank summary, and per-dimension actions if the user has run the
// assessment. First-time users see a calm "Get Started" CTA.
//
// Auth: any signed-in user. No admin gate.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, BookOpen, TargetIcon, ArrowRight, Star, Wrench, Brain, Layers,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReadinessMeter } from "./readiness-meter";

export const metadata: Metadata = { title: "Interview Lab · ProdMatch" };
export const dynamic = "force-dynamic";

type ReadinessRow = {
  dsa_score: number;
  system_design_score: number;
  behavioral_score: number;
  domain_score: number;
  actions: Array<{ dimension: string; headline: string; why: string; estimated_lift: number }>;
  target_role_function: string | null;
  updated_at: string;
};

type StoryRow = {
  competency: string;
  is_starred: boolean;
  polished: boolean;
};

export default async function LabPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: readiness }, { data: stories }, { data: profile }] = await Promise.all([
    (supabase
      .from("interview_readiness")
      .select("dsa_score, system_design_score, behavioral_score, domain_score, actions, target_role_function, updated_at")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{ data: ReadinessRow | null }>),
    (supabase
      .from("interview_stories")
      .select("competency, is_starred, polished")
      .eq("user_id", user.id) as unknown as Promise<{ data: StoryRow[] | null }>),
    (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>),
  ]);

  const hasResume = Boolean(profile?.resume_parsed);
  const storyList = stories ?? [];
  const totalStories = storyList.length;
  const starredStories = storyList.filter((s) => s.is_starred).length;
  const polishedStories = storyList.filter((s) => s.polished).length;
  const competencyCoverage = new Set(storyList.map((s) => s.competency)).size;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Interview Lab
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Crack the product company interview
        </h1>
        <p className="text-sm text-muted-foreground">
          Built for engineers moving from IT services into product companies. Pulls from your resume to generate STAR stories,
          score your readiness across DSA / System Design / Behavioral / Domain, and translate service-co bullets into
          product-co language.
        </p>
      </header>

      {!hasResume && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Upload your resume first
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Interview Lab reads your parsed resume to generate stories and grade your readiness. Add one in your{" "}
            <Link href="/profile" className="underline underline-offset-4">Profile</Link> to unlock.
          </p>
        </section>
      )}

      {/* Readiness section */}
      {readiness ? (
        <section className="space-y-3">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <TargetIcon className="h-4 w-4 text-primary" />
                Readiness Mirror
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Last updated {timeAgo(readiness.updated_at)}{readiness.target_role_function ? ` · target: ${readiness.target_role_function}` : ""}
              </p>
            </div>
            <Link
              href="/lab/readiness"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-medium hover:bg-card"
            >
              Re-assess <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <ReadinessMeter
            dsa={readiness.dsa_score}
            systemDesign={readiness.system_design_score}
            behavioral={readiness.behavioral_score}
            domain={readiness.domain_score}
          />
          {readiness.actions && readiness.actions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-3 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Lift +10 this week
              </p>
              <ul className="space-y-2">
                {readiness.actions.map((a, i) => (
                  <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                    <div className="flex items-start gap-2">
                      <DimensionIcon dim={a.dimension} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.headline}</p>
                        <p className="text-[11px] text-muted-foreground">{a.why}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        +{a.estimated_lift}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <TargetIcon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Take the 2-minute readiness check</p>
              <p className="text-xs text-muted-foreground">
                12 quick questions. We score your DSA / System Design / Behavioral / Domain readiness and tell you the 4 things to do this week to lift each by 10 points.
              </p>
            </div>
          </div>
          <Link
            href="/lab/readiness"
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold sm:w-auto ${
              hasResume
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
            aria-disabled={!hasResume}
          >
            Start readiness check <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* Story Bank summary */}
      <section className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Story Bank</p>
              <p className="text-xs text-muted-foreground">
                STAR stories generated from your resume. Polish them, star your favourites, rehearse before behavioral rounds.
              </p>
            </div>
          </div>
          {totalStories > 0 && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              {totalStories}
            </span>
          )}
        </div>

        {totalStories > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total" value={String(totalStories)} icon={<BookOpen className="h-3 w-3" />} />
            <Stat label="Polished" value={String(polishedStories)} icon={<CheckCircle2 className="h-3 w-3" />} />
            <Stat label="Starred" value={String(starredStories)} icon={<Star className="h-3 w-3" />} />
          </div>
        )}

        {totalStories > 0 && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Coverage ({competencyCoverage} of 10 competencies)
            </p>
            <CompetencyDots covered={new Set(storyList.map((s) => s.competency))} />
          </div>
        )}

        <Link
          href="/lab/stories"
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold sm:w-auto ${
            hasResume
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
          aria-disabled={!hasResume}
        >
          {totalStories > 0 ? "Open Story Bank" : "Generate my Story Bank"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Project Translator pointer */}
      <section className="rounded-2xl border border-border bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wrench className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Project Translator</p>
            <p className="text-xs text-muted-foreground">
              Rewrite a service-company bullet into product-company interview register. Open it next to any work bullet in your{" "}
              <Link href="/profile/resume" className="underline underline-offset-4">Resume Editor</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────

const COMPETENCIES = [
  "leadership", "ownership", "conflict", "scope_change", "technical_depth",
  "business_impact", "failure_learning", "mentorship", "ambiguity", "cross_functional",
] as const;

function CompetencyDots({ covered }: { covered: Set<string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COMPETENCIES.map((c) => {
        const has = covered.has(c);
        return (
          <span
            key={c}
            title={c.replaceAll("_", " ")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              has
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-border bg-background/40 text-muted-foreground"
            }`}
          >
            {has && <CheckCircle2 className="h-2.5 w-2.5" />}
            {c.replaceAll("_", " ")}
          </span>
        );
      })}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DimensionIcon({ dim }: { dim: string }) {
  const map: Record<string, React.ReactNode> = {
    dsa:           <Brain className="h-3.5 w-3.5 shrink-0 text-primary" />,
    system_design: <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />,
    behavioral:    <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />,
    domain:        <Wrench className="h-3.5 w-3.5 shrink-0 text-primary" />,
  };
  return <>{map[dim] ?? <Wrench className="h-3.5 w-3.5 shrink-0 text-primary" />}</>;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
