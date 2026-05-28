import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DSA_V2_PATTERNS_DISPLAY } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionHeader } from "@/components/admin/pm";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Admin · DSA · Review Question" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuestionRow = {
  id: string;
  slug: string;
  version: number;
  status: "pending_review" | "live" | "rejected" | "deferred" | "archived";
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  primary_role: string;
  roles: string[];
  bucket: "pure_dsa" | "ai_applied" | "indian_domain";
  batch_no: number;
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
  code_java: string;
  code_cpp: string;
  complexity_time: string;
  complexity_space: string;
  pitfalls: string[];
  edge_cases: string[];
  why_it_matters: string;
  estimated_minutes: number;
  authored_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewEvent = {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
};

const STATUS_TONE = {
  pending_review: "warn"    as const,
  live:           "ok"      as const,
  rejected:       "err"     as const,
  deferred:       "warn"    as const,
  archived:       "neutral" as const,
};

export default async function DsaQuestionReviewPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const [questionResult, historyResult] = await Promise.all([
    admin.from("dsa_questions").select("*").eq("id", id).maybeSingle() as never,
    admin.from("dsa_question_review_events")
      .select("id, action, reason, created_at")
      .eq("question_id", id)
      .order("created_at", { ascending: false })
      .limit(20) as never,
  ]);

  const q = (questionResult as { data: QuestionRow | null }).data;
  if (!q) notFound();

  const history = ((historyResult as { data: ReviewEvent[] | null }).data ?? []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 96px" }}>
      <div style={{ marginBottom: 14 }}>
        <Link href="/admin/content/dsa/queue" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          ← Back to queue
        </Link>
      </div>

      <header style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Badge tone={STATUS_TONE[q.status]}>{q.status.replace("_", " ")}</Badge>
          <Badge tone="neutral">{q.bucket.replace("_", " ")}</Badge>
          <Badge tone={q.difficulty === "hard" ? "err" : q.difficulty === "medium" ? "warn" : "ok"}>{q.difficulty}</Badge>
          <Badge tone="neutral">{DSA_V2_PATTERNS_DISPLAY[q.pattern as keyof typeof DSA_V2_PATTERNS_DISPLAY] ?? q.pattern}</Badge>
          <Badge tone="neutral">{q.primary_role.replace(/_/g, " ")}</Badge>
          <Badge tone="neutral">Batch {q.batch_no}</Badge>
          <Badge tone="neutral">~{q.estimated_minutes} min</Badge>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>{q.title}</h1>
        <p className="pm-mono" style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>{q.slug} · v{q.version}</p>
      </header>

      <ReviewActions
        questionId={q.id}
        status={q.status}
        rejectionReason={q.rejection_reason}
        internalNotes={q.internal_notes}
      />

      <SectionHeader title="Framing" />
      <Card p={16}>
        <p style={{ fontSize: 14, lineHeight: 1.55 }}>{q.framing}</p>
      </Card>

      <SectionHeader title="Problem statement" />
      <Card p={16}>
        <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{q.statement}</p>
      </Card>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 14 }}>
        <Card p={16}>
          <Subtle>Input format</Subtle>
          <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{q.input_format}</p>
        </Card>
        <Card p={16}>
          <Subtle>Output format</Subtle>
          <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{q.output_format}</p>
        </Card>
      </div>

      <SectionHeader title="Constraints" />
      <Card p={16}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          {q.constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </Card>

      <SectionHeader title="Examples" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.examples.map((ex, i) => (
          <Card key={i} p={16}>
            <Subtle>Example {i + 1}</Subtle>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <Snippet label="Input"  value={ex.input} />
              <Snippet label="Output" value={ex.output} />
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{ex.explanation}</p>
          </Card>
        ))}
      </div>

      <SectionHeader title="Approach (reveal stage 2)" sub="What the learner sees after they ask for a nudge" />
      <Card p={16}>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {q.approach.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      </Card>

      <SectionHeader title="Solution steps (reveal stage 3)" sub="Step-by-step walkthrough the learner unlocks last" />
      <Card p={16}>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {q.solution_steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      </Card>

      <SectionHeader title="Solutions (Python, Java, C++)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <CodeBlock language="Python" code={q.code_python} />
        <CodeBlock language="Java"   code={q.code_java}   />
        <CodeBlock language="C++"    code={q.code_cpp}    />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 14 }}>
        <Card p={16}>
          <Subtle>Time complexity</Subtle>
          <p className="pm-mono" style={{ marginTop: 6, fontSize: 13 }}>{q.complexity_time}</p>
        </Card>
        <Card p={16}>
          <Subtle>Space complexity</Subtle>
          <p className="pm-mono" style={{ marginTop: 6, fontSize: 13 }}>{q.complexity_space}</p>
        </Card>
      </div>

      <SectionHeader title="Pitfalls" />
      <Card p={16}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>
          {q.pitfalls.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </Card>

      <SectionHeader title="Edge cases" />
      <Card p={16}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" }}>
          {q.edge_cases.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </Card>

      <SectionHeader title="Why it matters" />
      <Card p={16}>
        <p style={{ fontSize: 13, lineHeight: 1.55 }}>{q.why_it_matters}</p>
      </Card>

      <SectionHeader title="Review history" />
      <Card p={0}>
        {history.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No actions taken yet.
          </div>
        ) : (
          <div>
            {history.map((h, i) => (
              <div key={h.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "12px 16px",
                borderBottom: i === history.length - 1 ? "none" : "1px solid var(--line)",
                gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{h.action}</div>
                  {h.reason && (
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{h.reason}</div>
                  )}
                </div>
                <div className="pm-num" style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                  {new Date(h.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Subtle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
      color: "var(--text-3)",
    }}>{children}</p>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Subtle>{label}</Subtle>
      <pre className="pm-mono" style={{
        marginTop: 6, padding: 10, borderRadius: 8,
        background: "var(--surface-2, color-mix(in oklab, var(--surface) 92%, black))",
        border: "1px solid var(--line)",
        fontSize: 12, lineHeight: 1.5,
        whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto",
      }}>{value}</pre>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <Card p={0}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", borderBottom: "1px solid var(--line)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{language}</span>
        <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {code.split("\n").length} lines
        </span>
      </div>
      <pre className="pm-mono" style={{
        margin: 0, padding: 14,
        fontSize: 12, lineHeight: 1.55,
        whiteSpace: "pre", overflowX: "auto",
      }}>{code}</pre>
    </Card>
  );
}
