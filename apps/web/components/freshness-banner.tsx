import { Database, TrendingUp } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Surfaces when jobs were last refreshed across the 18 companies.
// Subtle trust signal — users want to know they aren't browsing stale data.
export async function FreshnessBanner() {
  const supabase = await createSupabaseServerClient();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: lastRun }, { count: companiesCovered }, { count: newToday }, { count: activeTotal }, { count: newThisWeek }] = await Promise.all([
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
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
  ]);

  const finishedAt = lastRun?.finished_at;
  if (!finishedAt) return null;

  const ago = formatAgo(finishedAt);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-secondary/40 px-4 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" aria-hidden />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        </span>
        <Database className="h-3 w-3 text-success/80" aria-hidden />
        <span>
          Refreshed <span className="font-medium text-foreground">{ago}</span>
          {(companiesCovered ?? 0) > 0 && <> · <span className="text-foreground/60">{companiesCovered} companies</span></>}
          {(newToday ?? 0) > 0 && <> · <span className="font-medium text-success">+{newToday} new today</span></>}
          <span className="ml-2 opacity-50">· Official career pages only</span>
        </span>
      </div>

      {/* Right side: market pulse */}
      {(activeTotal ?? 0) > 0 && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <TrendingUp className="h-3 w-3 text-primary/60" aria-hidden />
          <span className="opacity-60">
            <span className="font-medium text-foreground/80">{(activeTotal ?? 0).toLocaleString("en-IN")}</span> live roles
            {(newThisWeek ?? 0) > 0 && (
              <> · <span className="text-primary/70">+{newThisWeek} this week</span></>
            )}
          </span>
        </div>
      )}
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
