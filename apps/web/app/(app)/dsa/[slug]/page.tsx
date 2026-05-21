import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  ExternalLink,
  Target,
} from "lucide-react";
import {
  DSA_CATALOG,
  DSA_PATTERNS_DISPLAY,
  getDsaLearningGuide,
  getDsaProblemBySlug,
} from "@prodmatch/shared";
import { cn } from "@/lib/utils";
import { RevealSections } from "./reveal-sections";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return DSA_CATALOG.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const problem = getDsaProblemBySlug(slug);
  return { title: problem ? `${problem.title} · DSA Practice` : "DSA Practice" };
}

export default async function DsaProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = getDsaProblemBySlug(slug);
  if (!problem) notFound();

  const guide = getDsaLearningGuide(problem);
  const similar = guide.similarSlugs.map(getDsaProblemBySlug).filter(Boolean);

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
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{problem.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{guide.whyItMatters}</p>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Open on LeetCode
        </a>
      </header>

      <LessonBlock icon={<BookOpen className="h-4 w-4" />} title="Question">
        <p>{guide.prompt}</p>
        <div className="mt-3 space-y-1.5">
          {guide.examples.map((example) => (
            <p key={example} className="rounded-md bg-secondary/50 px-2 py-1 font-mono text-[12px] text-muted-foreground">
              {example}
            </p>
          ))}
        </div>
      </LessonBlock>

      <RevealSections guide={guide} />

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
