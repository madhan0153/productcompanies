import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Target,
} from "lucide-react";
import {
  DSA_PATTERNS_DISPLAY,
  getDsaLearningGuide,
  getDsaProblemBySlug,
  getDsaRoleTrack,
  type DsaConfidence,
} from "@prodmatch/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ConfidenceRating } from "../confidence-rating";
import { RevealSections } from "./reveal-sections";

// QA fix (B16): the page loads per-user dsa_user_progress, so it has to be
// dynamic. generateStaticParams was wasted CPU at build time because
// force-dynamic always won. Drop the static params; keep force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const problem = getDsaProblemBySlug(slug);
  if (!problem) return { title: "DSA Practice" };
  const title = `${problem.title} - Python, Java, C++ Solution | ProdMatch`;
  const description = `Solve ${problem.title} (${DSA_PATTERNS_DISPLAY[problem.pattern]}) as a role-specific product-team simulation with full explanation, Python/Java/C++ code, complexity analysis, edge cases, and spaced repetition.`;
  return {
    title,
    description,
    alternates: { canonical: `/dsa/${slug}` },
    openGraph: { title, description },
  };
}

export default async function DsaProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = getDsaProblemBySlug(slug);
  if (!problem) notFound();

  const guide = getDsaLearningGuide(problem);
  const similar = guide.similarSlugs.map(getDsaProblemBySlug).filter(Boolean);
  const progress = await loadDsaProgress(problem.slug);
  const roleTrack = getDsaRoleTrack(problem.primaryRole);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/dsa" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to DSA
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dsa/patterns#${problem.pattern}`}
            className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground"
          >
            {DSA_PATTERNS_DISPLAY[problem.pattern]}
          </Link>
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[11px] font-semibold uppercase",
              problem.difficulty === "easy" && "bg-success/10 text-success",
              problem.difficulty === "medium" && "bg-warning/10 text-warning",
              problem.difficulty === "hard" && "bg-destructive/10 text-destructive",
            )}
          >
            {problem.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {guide.estimatedMinutes} min
          </span>
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary">
            {roleTrack.label}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{problem.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{guide.whyItMatters}</p>
      </header>

      <section className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
        <ContextCell label="Company context" value={`${problem.context.company} · ${problem.context.productTeam}`} />
        <ContextCell label="Freshness" value={problem.context.month} />
        <ContextCell label="Product surface" value={problem.context.productSurface} />
        <p className="sm:col-span-3">{problem.context.disclaimer}</p>
      </section>

      <LessonBlock icon={<BookOpen className="h-4 w-4" />} title="Question">
        <p>{guide.prompt}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SpecBlock title="Input" lines={[problem.inputFormat]} />
          <SpecBlock title="Output" lines={[problem.outputFormat]} />
          <SpecBlock title="Constraints" lines={problem.constraints} />
          <SpecBlock title="Concepts" lines={problem.concepts} />
        </div>
        <div className="mt-3 space-y-1.5">
          {guide.examples.map((example) => (
            <p key={example} className="rounded-md bg-secondary/50 px-2 py-1 font-mono text-[12px] text-muted-foreground">
              {example}
            </p>
          ))}
        </div>
      </LessonBlock>

      <RevealSections guide={guide} />

      <ConfidenceRating
        problemSlug={problem.slug}
        initialConfidence={progress?.confidence ?? null}
        initialNextReview={progress?.next_review_at ?? null}
      />

      {guide.pitfalls.length > 0 && (
        <LessonBlock icon={<Target className="h-4 w-4" />} title="Common Mistakes">
          <ul className="space-y-1.5">
            {guide.pitfalls.map((pitfall) => (
              <li key={pitfall} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                <span>{pitfall}</span>
              </li>
            ))}
          </ul>
        </LessonBlock>
      )}

      {similar.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Next Similar Problems</h2>
          <div className="space-y-2">
            {similar.map((item) => item && (
              <Link
                key={item.slug}
                href={`/dsa/${item.slug}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/50"
              >
                <span className="min-w-0 truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.difficulty}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function loadDsaProgress(
  slug: string,
): Promise<{ confidence: DsaConfidence; next_review_at: string } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await (supabase
      .from("dsa_user_progress")
      .select("confidence, next_review_at")
      .eq("user_id", user.id)
      .eq("problem_slug", slug)
      .maybeSingle() as unknown as Promise<{
        data: { confidence: DsaConfidence; next_review_at: string } | null;
      }>);
    return data ?? null;
  } catch {
    return null;
  }
}

function LessonBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function ContextCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  );
}

function SpecBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">{title}</p>
      <ul className="mt-2 space-y-1">
        {lines.map((line) => (
          <li key={line} className="text-xs leading-relaxed text-muted-foreground">{line}</li>
        ))}
      </ul>
    </div>
  );
}
