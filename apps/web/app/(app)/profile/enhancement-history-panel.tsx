// Enhancement history — server-rendered panel for the Profile page.
//
// Shows recent finalised runs with a download link, plus discarded runs
// (collapsed) so the user can trace what they've already done. Pending
// rows are NOT listed here — they're already surfaced as a callout above.

import Link from "next/link";
import { Sparkles, Download, History, X } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SectionCard } from "@/components/section-card";
import type { AtsScorecard } from "@/lib/matching/ats-scorecard";

interface HistoryRow {
  id: string;
  status: "finalised" | "discarded" | "pending_review";
  target_role_function: string | null;
  generated_at: string;
  finalised_at: string | null;
  ats_before: AtsScorecard | null;
  ats_after: AtsScorecard | null;
}

export async function EnhancementHistoryPanel({ userId }: { userId: string }) {
  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin
    .from("enhanced_resumes")
    .select("id, status, target_role_function, generated_at, finalised_at, ats_before, ats_after")
    .eq("user_id", userId)
    .neq("status", "pending_review")
    .order("generated_at", { ascending: false })
    .limit(8) as any) as { data: HistoryRow[] | null };

  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <SectionCard
      title="Enhancement history"
      subtitle="Previous AI-reviewed enhancement runs"
      icon={<History className="h-4 w-4" />}
    >
      <ul className="space-y-2">
        {rows.map((r) => {
          const before = r.ats_before?.total ?? null;
          const after = r.ats_after?.total ?? null;
          const delta = before !== null && after !== null ? after - before : null;
          return (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                r.status === "finalised"
                  ? "border-success/20 bg-success/5"
                  : "border-border bg-secondary/30"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card">
                {r.status === "finalised"
                  ? <Sparkles className="h-3.5 w-3.5 text-success" aria-hidden />
                  : <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {r.status === "finalised" ? "Enhanced" : "Discarded"}
                  {r.target_role_function ? <span className="text-muted-foreground"> · {r.target_role_function.replace(/_/g, " ")}</span> : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.finalised_at ?? r.generated_at).toLocaleString()}
                  {delta !== null && (
                    <span className={`ml-2 font-semibold ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : ""}`}>
                      ATS {before}→{after} ({delta > 0 ? "+" : ""}{delta})
                    </span>
                  )}
                </p>
              </div>
              {r.status === "finalised" && (
                <Link
                  href={`/profile/enhance/${r.id}/print?autoprint=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-ring"
                >
                  <Download className="h-3 w-3" /> PDF
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
