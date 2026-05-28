import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Sparkles, ShieldCheck, Clock3, ArrowRight } from "lucide-react";
import { DSA_V2_PATTERNS_DISPLAY, DSA_V2_PATTERN_ROADMAP } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/seo/site";

// DSA Lab v2 — public, live question experience.
//
// Reads the manually-reviewed `live` questions directly via the service-role
// client (server-only; question content is non-PII so this is safe and keeps
// the page indexable without auth). Until at least one question is approved
// the page falls back to the transition placeholder.

export const metadata: Metadata = {
  title: "DSA Lab — Hand-Authored Interview Questions | ProdMatch.ai",
  description:
    "Practice hand-authored DSA interview questions with fresh original framings and full Python / Java / C++ solutions, built for India's top product-company interviews.",
  alternates: { canonical: "/dsa" },
  openGraph: {
    title: "DSA Lab — Hand-Authored Interview Questions",
    description: "Fresh original DSA questions with full Python / Java / C++ solutions.",
    url: absoluteUrl("/dsa"),
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LiveRow = {
  slug: string;
  title: string;
  framing: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  bucket: "pure_dsa" | "ai_applied" | "indian_domain";
  estimated_minutes: number;
};

const BUCKET_LABEL: Record<LiveRow["bucket"], string> = {
  pure_dsa: "Pure DSA",
  ai_applied: "AI-applied",
  indian_domain: "Indian domain",
};

const DIFF_CLASS: Record<LiveRow["difficulty"], string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

// Stable per-day index so the featured question is consistent all day.
function dailyIndex(len: number): number {
  if (len === 0) return 0;
  const key = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % len;
}

const PATTERN_ORDER: Record<string, number> = Object.fromEntries(
  DSA_V2_PATTERN_ROADMAP.map((p) => [p.pattern, p.order]),
);

export default async function DsaPage() {
  const admin = createSupabaseAdminClient();
  const { data } = (await admin
    .from("dsa_questions")
    .select("slug, title, framing, pattern, difficulty, bucket, estimated_minutes")
    .eq("status", "live")
    .order("pattern", { ascending: true })
    .order("difficulty", { ascending: true }) as never) as { data: LiveRow[] | null };

  const live = data ?? [];

  if (live.length === 0) return <TransitionPlaceholder />;

  const featured = live[dailyIndex(live.length)];

  // Group by pattern, ordered by the roadmap sequence.
  const byPattern = new Map<string, LiveRow[]>();
  for (const q of live) {
    if (!byPattern.has(q.pattern)) byPattern.set(q.pattern, []);
    byPattern.get(q.pattern)!.push(q);
  }
  const groups = [...byPattern.entries()].sort(
    (a, b) => (PATTERN_ORDER[a[0]] ?? 99) - (PATTERN_ORDER[b[0]] ?? 99),
  );

  return (
    <div className="space-y-8 py-2">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">DSA Lab</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Practice Interview Questions</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Hand-authored, manually reviewed questions with fresh framings and full Python / Java / C++ solutions.
          {" "}
          <span className="font-medium text-foreground">{live.length}</span> live and growing.
        </p>
      </header>

      {/* Today's pick */}
      <Link
        href={`/dsa/${featured.slug}`}
        className="group block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Today&apos;s pick</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{featured.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{featured.framing}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill className={DIFF_CLASS[featured.difficulty]}>{featured.difficulty}</Pill>
          <Pill>{DSA_V2_PATTERNS_DISPLAY[featured.pattern as keyof typeof DSA_V2_PATTERNS_DISPLAY] ?? featured.pattern}</Pill>
          <Pill>{BUCKET_LABEL[featured.bucket]}</Pill>
          <Pill>~{featured.estimated_minutes} min</Pill>
          <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Start <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </div>
      </Link>

      {/* Browse by pattern */}
      <section className="space-y-6">
        {groups.map(([pattern, items]) => (
          <div key={pattern} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                {DSA_V2_PATTERNS_DISPLAY[pattern as keyof typeof DSA_V2_PATTERNS_DISPLAY] ?? pattern}
              </h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((q) => (
                <Link
                  key={q.slug}
                  href={`/dsa/${q.slug}`}
                  className="group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug">{q.title}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${DIFF_CLASS[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{q.framing}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{BUCKET_LABEL[q.bucket]}</span>
                    <span aria-hidden>·</span>
                    <span>~{q.estimated_minutes} min</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className || "bg-secondary text-secondary-foreground"}`}>
      {children}
    </span>
  );
}

// Shown only while zero questions have been approved to live.
function TransitionPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">DSA Lab · v2 in progress</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              We&apos;re rebuilding the DSA Lab from scratch.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The old templated catalog is gone. In its place we&apos;re hand-authoring 800 original questions —
              fresh framings, full Python / Java / C++ solutions, and a progressive reveal experience designed for
              India&apos;s top product interviews. Every question is reviewed manually before it goes live.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Tile icon={<Sparkles className="h-4 w-4" />} title="800 questions" body="85% pure DSA · 10% AI-applied · 5% Indian product domain. Fresh original framings only." />
        <Tile icon={<ShieldCheck className="h-4 w-4" />} title="Every question reviewed" body="Nothing reaches you until it passes manual review in the admin queue. Quality over volume." />
        <Tile icon={<Clock3 className="h-4 w-4" />} title="90-day no-repeat" body="Your daily picks won't recycle for three months once the new bank is live." />
      </section>

      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll email you the moment the first batch goes live. No filler — only fully reviewed questions.
      </p>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
