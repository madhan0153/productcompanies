import { Compass, Target, Mic2 } from "lucide-react";

// Pure-heuristic interview prep brief. No LLM call — just signal extracted from
// the title, tech stack, seniority, and company. Cheap, deterministic, and
// instantly available on every job page.

type Props = {
  title: string;
  companyName: string;
  companySlug: string | null;
  seniority: string | null;
  techStack: string[];
};

const ROUNDS_BY_TIER: Record<string, string[]> = {
  big_tech: [
    "Phone screen — 1 coding (45m)",
    "Online assessment — 2 problems (90m)",
    "On-site loop: 2 coding, 1 system design, 1 behavioural",
    "Bar-raiser / hiring committee review",
  ],
  india_product: [
    "Recruiter screen (30m)",
    "Coding round — DS/algo (60m)",
    "Practical / pairing round on a domain problem",
    "System design (for senior+)",
    "Hiring manager + culture fit",
  ],
  default: [
    "Recruiter screen (30m)",
    "Technical phone screen (60m)",
    "On-site / virtual loop: coding + design + behavioural",
    "Hiring manager wrap-up",
  ],
};

const BIG_TECH = new Set(["google", "microsoft", "meta", "amazon", "apple", "atlassian", "nvidia", "oracle", "salesforce", "sap-labs"]);
const INDIA_PRODUCT = new Set(["razorpay", "phonepe", "zerodha", "cred", "groww", "swiggy", "zomato", "flipkart"]);

function inferTier(slug: string | null): keyof typeof ROUNDS_BY_TIER {
  if (slug && BIG_TECH.has(slug)) return "big_tech";
  if (slug && INDIA_PRODUCT.has(slug)) return "india_product";
  return "default";
}

function isFrontend(stack: string[]): boolean {
  const s = new Set(stack.map((t) => t.toLowerCase()));
  return ["react", "react.js", "next", "next.js", "vue", "angular", "typescript", "javascript", "css", "tailwind"]
    .some((k) => s.has(k));
}

function isBackend(stack: string[]): boolean {
  const s = new Set(stack.map((t) => t.toLowerCase()));
  return ["go", "golang", "java", "spring", "kotlin", "python", "django", "rust", "node.js", "node", "postgres", "kafka", "redis"]
    .some((k) => s.has(k));
}

function isData(stack: string[], title: string): boolean {
  const s = new Set(stack.map((t) => t.toLowerCase()));
  return /data|ml|machine learning/i.test(title)
    || ["spark", "airflow", "hadoop", "snowflake", "dbt", "pytorch", "tensorflow"].some((k) => s.has(k));
}

function buildLikelyQuestions(title: string, seniority: string | null, stack: string[]): string[] {
  const q: string[] = [];
  const isSenior = seniority && ["senior", "staff", "principal", "manager", "director"].includes(seniority);

  // Coding
  if (isData(stack, title)) {
    q.push("Walk through a feature you built end-to-end — pipeline, model, serving.");
  } else {
    q.push(`Solve a medium DS/algo problem in your strongest language (likely ${stack[0] ?? "your top language"}).`);
  }

  // Domain depth
  if (isFrontend(stack)) {
    q.push("Design a complex UI component (e.g. virtualised list, autocomplete) with state handling, accessibility, and perf trade-offs.");
  }
  if (isBackend(stack)) {
    q.push("Walk through how you'd scale a service to 10× load — bottlenecks, caching, partitioning.");
  }

  // System design — gated to senior+
  if (isSenior) {
    q.push("System design: design a system that resembles a real product the company runs (e.g. payment flow, recommendation feed).");
  }

  // Behavioural — always
  q.push("Tell me about a time you owned a project end-to-end. What went wrong, and what did you change?");

  // Trade-offs (senior+)
  if (isSenior) {
    q.push("Tell me about a hard technical trade-off you made — the alternatives you weighed and the call you took.");
  }

  return q.slice(0, 5);
}

export function PrepBrief({ title, companyName, companySlug, seniority, techStack }: Props) {
  const tier = inferTier(companySlug);
  const rounds = ROUNDS_BY_TIER[tier];
  const questions = buildLikelyQuestions(title, seniority, techStack);

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-cool/5 via-card/40 to-card/40 p-6 elev-1 backdrop-blur">
      <header className="mb-4 flex items-center gap-2">
        <Compass className="h-4 w-4 text-cool" />
        <h2 className="font-display text-sm font-semibold">Interview prep brief</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">Heuristic · no LLM cost</span>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Likely loop at {companyName}
          </h3>
          <ol className="space-y-1.5 text-sm">
            {rounds.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cool/15 text-[10px] font-semibold text-cool">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Mic2 className="h-3.5 w-3.5" /> Five questions to expect
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-cool">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
