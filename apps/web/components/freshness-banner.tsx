import { Database } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Surfaces when jobs were last refreshed across the 18 companies.
// Subtle trust signal — users want to know they aren't browsing stale data.
export async function FreshnessBanner() {
  const supabase = await createSupabaseServerClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: lastRun }, { count: companiesCovered }, { count: newToday }] = await Promise.all([
    supabase
      .from("crawl_runs")
      .select("finished_at")
      .eq("status", "success")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("crawl_runs")
      .select("company_id", { count: "exact", head: true })
      .gte("started_at", since24h)
      .eq("status", "success"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
  ]);

  const finishedAt = lastRun?.finished_at;
  if (!finishedAt) return null;

  const ago = formatAgo(finishedAt);

  return (
    <div className="flex items-center justify-center gap-3 border-b border-border/60 bg-secondary/30 px-4 py-1.5 text-xs text-muted-foreground">
      <Database className="h-3 w-3 text-emerald-400" aria-hidden />
      <span>
        Jobs refreshed <span className="font-medium text-foreground">{ago}</span>
        {(companiesCovered ?? 0) > 0 && <> · {companiesCovered} companies</>}
        {(newToday ?? 0) > 0 && <> · <span className="text-emerald-400">+{newToday} new today</span></>}
      </span>
    </div>
  );
}

function formatAgo(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return days === 1 ? "yesterday" : `${days}d ago`;
  } catch {
    return "recently";
  }
}
