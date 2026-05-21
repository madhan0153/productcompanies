import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev review fix: expanded /api/health.
 *
 * Reports:
 *   - supabase connectivity
 *   - last successful crawl_run timestamp
 *   - last successful match recompute timestamp
 *   - count of dead LLM keys (if the table is present)
 *
 * Every individual probe is wrapped in try/catch — a single missing
 * table never crashes the whole health response. Status is 200 when
 * Supabase is reachable, 503 only when the core connection fails.
 *
 * Aggregator-safe: each field reports its own status string instead
 * of throwing, so an external uptime monitor sees a complete picture
 * even during partial outages.
 */
export async function GET() {
  const startedAt = Date.now();
  let supabaseStatus: "connected" | "error" | "unreachable" = "unreachable";
  let companies: number | null = null;
  let lastCrawl: { ok: boolean; at: string | null; status: string | null } = {
    ok: false,
    at: null,
    status: null,
  };
  let lastRecompute: string | null = null;
  let deadKeys: number | null = null;
  let topLevelError: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();

    // 1) Core connectivity probe.
    try {
      const { error, count } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });
      if (error) {
        supabaseStatus = "error";
        topLevelError = error.message;
      } else {
        supabaseStatus = "connected";
        companies = count ?? 0;
      }
    } catch (e) {
      supabaseStatus = "unreachable";
      topLevelError = (e as Error).message;
    }

    if (supabaseStatus === "connected") {
      // 2) Last successful crawl_run.
      try {
        const { data } = (await (supabase
          .from("crawl_runs")
          .select("started_at, status")
          .eq("status", "success")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{
            data: { started_at: string; status: string } | null;
          }>));
        lastCrawl = {
          ok: !!data,
          at: data?.started_at ?? null,
          status: data?.status ?? null,
        };
      } catch {
        // crawl_runs may not exist on a fresh schema — leave defaults.
      }

      // 3) Last successful recompute (most recent profiles.last_match_compute_at).
      try {
        const { data } = (await (supabase
          .from("profiles")
          .select("last_match_compute_at")
          .order("last_match_compute_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{
            data: { last_match_compute_at: string | null } | null;
          }>));
        lastRecompute = data?.last_match_compute_at ?? null;
      } catch {
        /* ignored */
      }

      // 4) Dead LLM keys.
      try {
        const { count } = await supabase
          .from("llm_dead_keys")
          .select("provider", { count: "exact", head: true });
        deadKeys = count ?? 0;
      } catch {
        /* dead-keys table may not exist */
      }
    }
  } catch (err) {
    topLevelError = (err as Error).message;
  }

  const ok = supabaseStatus === "connected";
  return NextResponse.json(
    {
      ok,
      supabase: supabaseStatus,
      companies,
      last_crawl: lastCrawl,
      last_recompute_at: lastRecompute,
      dead_keys: deadKeys,
      elapsed_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      ...(topLevelError ? { error: topLevelError } : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
