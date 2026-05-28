import type { Metadata } from "next";
import Link from "next/link";
import { DSA_V2_PATTERNS_DISPLAY } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, SectionHeader } from "@/components/admin/pm";
import { QueueFilters, ApproveAllButton } from "./queue-client";

export const metadata: Metadata = { title: "Admin · DSA Review Queue" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QueueRow = {
  id: string;
  slug: string;
  title: string;
  status: "pending_review" | "live" | "rejected" | "deferred" | "archived";
  bucket: "pure_dsa" | "ai_applied" | "indian_domain";
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  primary_role: string;
  batch_no: number;
  estimated_minutes: number;
  created_at: string;
  reviewed_at: string | null;
};

type SearchParams = {
  status?: string;
  bucket?: string;
  difficulty?: string;
  pattern?: string;
  role?: string;
  q?: string;
};

const STATUS_TONE = {
  pending_review: "warn"    as const,
  live:           "ok"      as const,
  rejected:       "err"     as const,
  deferred:       "warn"    as const,
  archived:       "neutral" as const,
};

const BUCKET_LABEL = {
  pure_dsa:      "Pure DSA",
  ai_applied:    "AI-applied",
  indian_domain: "Indian domain",
};

export default async function DsaQueuePage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("dsa_questions")
    .select("id, slug, title, status, bucket, pattern, difficulty, primary_role, batch_no, estimated_minutes, created_at, reviewed_at")
    .order("status", { ascending: true })       // pending_review sorts first
    .order("batch_no", { ascending: true })
    .order("created_at", { ascending: true });

  if (params.status)     query = query.eq("status", params.status);
  if (params.bucket)     query = query.eq("bucket", params.bucket);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);
  if (params.pattern)    query = query.eq("pattern", params.pattern);
  if (params.role)       query = query.eq("primary_role", params.role);
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    query = query.or(`slug.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error } = (await query) as unknown as { data: QueueRow[] | null; error: { message: string } | null };
  const rows = data ?? [];

  // KPIs across the WHOLE table (not just filtered subset) so the bar
  // never lies about the bank's true state.
  const { data: allRowsRaw } = (await admin
    .from("dsa_questions")
    .select("status") as never) as { data: { status: string }[] | null };
  const all = allRowsRaw ?? [];
  const counts = {
    total:   all.length,
    pending: all.filter((r) => r.status === "pending_review").length,
    live:    all.filter((r) => r.status === "live").length,
    rejected: all.filter((r) => r.status === "rejected").length,
    deferred: all.filter((r) => r.status === "deferred").length,
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · DSA · Review queue
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Question Review Queue
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Every authored question lands here as pending_review. Approve to make it live; reject or defer with a written reason. Live questions are the only ones eligible for daily dispatch.
        </p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/api/admin/dsa-v2-seed" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
            ↻ Seed repo bank → DB (idempotent)
          </Link>
          <ApproveAllButton pending={counts.pending} />
        </div>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <KPI label="Total"           value={String(counts.total)}    accent />
        <KPI label="Pending review"  value={String(counts.pending)}  />
        <KPI label="Live"            value={String(counts.live)}     />
        <KPI label="Rejected"        value={String(counts.rejected)} />
        <KPI label="Deferred"        value={String(counts.deferred)} />
      </div>

      <SectionHeader title="Filters" />
      <QueueFilters current={params} />

      {error && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "var(--err-soft)", color: "var(--err)", fontSize: 13 }}>
          DB error: {error.message}
        </div>
      )}

      <SectionHeader title={`${rows.length} question${rows.length === 1 ? "" : "s"}`} />
      {rows.length === 0 ? (
        <Card p={24}>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
            No questions match the current filters. {counts.total === 0 && "Seed the repo bank first using the link above."}
          </p>
        </Card>
      ) : (
        <Card p={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2, transparent)" }}>
                  <Th>Slug / Title</Th>
                  <Th>Status</Th>
                  <Th>Bucket</Th>
                  <Th>Pattern</Th>
                  <Th>Diff.</Th>
                  <Th>Role</Th>
                  <Th>Batch</Th>
                  <Th>Min.</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line)",
                    }}
                  >
                    <Td>
                      <Link
                        href={`/admin/content/dsa/queue/${r.id}`}
                        style={{ color: "var(--text)", textDecoration: "none", display: "block" }}
                      >
                        <div style={{ fontWeight: 600 }}>{r.title}</div>
                        <div className="pm-mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          {r.slug}
                        </div>
                      </Link>
                    </Td>
                    <Td><Badge tone={STATUS_TONE[r.status]}>{r.status.replace("_", " ")}</Badge></Td>
                    <Td><span style={{ fontSize: 12 }}>{BUCKET_LABEL[r.bucket]}</span></Td>
                    <Td><span style={{ fontSize: 12 }}>{DSA_V2_PATTERNS_DISPLAY[r.pattern as keyof typeof DSA_V2_PATTERNS_DISPLAY] ?? r.pattern}</span></Td>
                    <Td>
                      <Badge tone={r.difficulty === "hard" ? "err" : r.difficulty === "medium" ? "warn" : "ok"}>
                        {r.difficulty}
                      </Badge>
                    </Td>
                    <Td><span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.primary_role.replace(/_/g, " ")}</span></Td>
                    <Td><span className="pm-num" style={{ fontSize: 12 }}>{r.batch_no}</span></Td>
                    <Td><span className="pm-num" style={{ fontSize: 12 }}>{r.estimated_minutes}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      textAlign: "left", padding: "10px 12px",
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
      color: "var(--text-3)",
    }}>
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>{children}</td>;
}
