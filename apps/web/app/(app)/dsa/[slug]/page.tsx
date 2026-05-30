import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getDsaDailyState } from "@/lib/dsa/daily";
import { dsaQuota } from "@/lib/dsa/quotas";
import { absoluteUrl } from "@/lib/seo/site";
import { ProgressiveReveal } from "./reveal";
import { DifficultyPill, Pill, BUCKET_LABEL, patternLabel, type Difficulty, type Bucket } from "../_components/pills";

// Public per-question page. Only `live` (manually approved) questions are
// reachable. The problem, examples, Python solution, pitfalls, edge cases and
// "why it matters" are free + indexable; the full approach/walkthrough and the
// Java/C++ solutions are tier-gated and withheld from the initial payload for
// un-entitled users (revealed via server actions).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuestionRow = {
  slug: string;
  title: string;
  framing: string;
  statement: string;
  input_format: string;
  output_format: string;
  constraints: string[];
  examples: { input: string; output: string; explanation: string }[];
  approach: string[];
  solution_steps: string[];
  code_python: string;
  complexity_time: string;
  complexity_space: string;
  pitfalls: string[];
  edge_cases: string[];
  why_it_matters: string;
  pattern: string;
  difficulty: Difficulty;
  bucket: Bucket;
  estimated_minutes: number;
};

async function fetchLive(slug: string): Promise<QuestionRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = (await admin
    .from("dsa_questions")
    .select(
      "slug, title, framing, statement, input_format, output_format, constraints, examples, approach, solution_steps, code_python, complexity_time, complexity_space, pitfalls, edge_cases, why_it_matters, pattern, difficulty, bucket, estimated_minutes",
    )
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle() as never) as { data: QuestionRow | null };
  return data;
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const q = await fetchLive(slug);
  if (!q) return { title: "Question not found | ProdMatch.ai DSA Lab" };
  const desc = q.framing.length > 155 ? q.framing.slice(0, 152) + "…" : q.framing;
  return {
    title: `${q.title} — DSA Lab | ProdMatch.ai`,
    description: desc,
    alternates: { canonical: `/dsa/${q.slug}` },
    openGraph: { title: `${q.title} — DSA Lab`, description: desc, url: absoluteUrl(`/dsa/${q.slug}`) },
  };
}

export default async function DsaQuestionPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = await fetchLive(slug);
  if (!q) notFound();

  // Resolve viewer tier + today's status (anon → free).
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const plan = user ? (await getEntitlements(user.id)).plan : "free";
  const quota = dsaQuota(plan);
  const langsEntitled = quota.langs.includes("java");
  const entitledApproach = plan !== "free";

  const dailyState = user ? await getDsaDailyState(user.id, plan) : null;
  const todayStatus = dailyState?.today.status ?? "not_started";
  const fullApproachesRemaining =
    dailyState?.fullApproaches.remaining ??
    (quota.fullApproachesPerMonth === "unlimited" ? "unlimited" : quota.fullApproachesPerMonth);

  const approachTeaser = q.approach.slice(0, 3);

  return (
    <article className="mx-auto max-w-3xl space-y-6 py-2">
      <Link
        href="/dsa"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground motion-reduce:transition-none"
      >
        <ArrowLeft className="h-4 w-4" /> DSA Lab
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyPill d={q.difficulty} />
          <Pill>{patternLabel(q.pattern)}</Pill>
          <Pill>{BUCKET_LABEL[q.bucket]}</Pill>
          <Pill>~{q.estimated_minutes} min</Pill>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{q.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{q.framing}</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold tracking-tight">Problem</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.statement}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Block label="Input">{q.input_format}</Block>
          <Block label="Output">{q.output_format}</Block>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Constraints</p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {q.constraints.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="font-mono text-xs sm:text-sm">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Examples</h2>
        {q.examples.map((ex, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Example {i + 1}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Snippet label="Input" value={ex.input} />
              <Snippet label="Output" value={ex.output} />
            </div>
            {ex.explanation && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ex.explanation}</p>
            )}
          </div>
        ))}
      </section>

      <ProgressiveReveal
        slug={q.slug}
        signedIn={!!user}
        tier={plan}
        todayStatus={todayStatus}
        approachTeaser={approachTeaser}
        fullApproach={entitledApproach ? q.approach : null}
        fullSteps={entitledApproach ? q.solution_steps : null}
        fullApproachesRemaining={fullApproachesRemaining}
        codePython={q.code_python}
        langsEntitled={langsEntitled}
        annotations={quota.annotations}
        complexity={{ time: q.complexity_time, space: q.complexity_space }}
        pitfalls={q.pitfalls}
        edgeCases={q.edge_cases}
        whyItMatters={q.why_it_matters}
        aiCoach={quota.aiCoach}
      />
    </article>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 p-2.5 font-mono text-xs leading-relaxed">
        {value}
      </pre>
    </div>
  );
}
