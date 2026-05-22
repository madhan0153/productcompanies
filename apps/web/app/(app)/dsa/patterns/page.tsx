import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import {
  DSA_CATALOG,
  DSA_PATTERN_ROADMAP,
  DSA_PATTERNS_DISPLAY,
  type DsaPattern,
  type DsaProblem,
} from "@prodmatch/shared";
import { cn } from "@/lib/utils";
import { PatternAnimation } from "./pattern-animations";

export const metadata: Metadata = {
  title: "17 DSA Patterns for Product-Company Interviews — Roadmap + Problems",
  description: "Master 17 algorithmic patterns asked at Indian product companies: arrays + hashing, two pointers, sliding window, stacks, binary search, linked lists, trees, heap, graphs, DP, backtracking, intervals, tries, bit manipulation, math + geometry.",
  alternates: { canonical: "/dsa/patterns" },
  openGraph: {
    title: "17 DSA Patterns for Interviews — Pattern Roadmap",
    description: "Pattern-recognition roadmap for product-company DSA interviews. Foundational → graphs → DP.",
  },
};
export const dynamic = "force-static";

const PROBLEMS_BY_PATTERN: Record<DsaPattern, DsaProblem[]> = DSA_PATTERN_ROADMAP.reduce(
  (acc, item) => {
    acc[item.pattern] = DSA_CATALOG.filter((p) => p.pattern === item.pattern);
    return acc;
  },
  {} as Record<DsaPattern, DsaProblem[]>,
);

export default function DsaPatternsPage() {
  const items = DSA_PATTERN_ROADMAP.filter((item) => (PROBLEMS_BY_PATTERN[item.pattern]?.length ?? 0) > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/dsa" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to DSA
      </Link>

      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">DSA roadmap</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">All Patterns</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Seventeen interview patterns in the order you should learn them. Foundations first, then graphs and DP.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {items.map((item) => {
          const problems = PROBLEMS_BY_PATTERN[item.pattern] ?? [];
          return (
            <section
              key={item.pattern}
              id={item.pattern}
              className="rounded-lg border border-border bg-card p-4 scroll-mt-20"
            >
              <header className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                  {item.order}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold leading-tight">{item.label}</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.focus}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                  {problems.length}
                </span>
              </header>

              <PatternAnimation pattern={item.pattern} />

              <ul className="mt-3 space-y-1.5">
                {problems.map((problem) => (
                  <li key={problem.slug}>
                    <Link
                      href={`/dsa/${problem.slug}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm transition hover:border-border hover:bg-secondary/50"
                    >
                      <span className="min-w-0 truncate">{problem.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                            problem.difficulty === "easy" && "bg-success/10 text-success",
                            problem.difficulty === "medium" && "bg-warning/10 text-warning",
                            problem.difficulty === "hard" && "bg-destructive/10 text-destructive",
                          )}
                        >
                          {problem.difficulty}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Pattern key: <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">{DSA_PATTERNS_DISPLAY[item.pattern]}</code>
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
