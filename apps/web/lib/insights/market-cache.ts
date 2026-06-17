import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { aggregateMarketBuckets, type MarketBuckets, type MarketJobLite } from "./market-intel";

// Market-signal data is GLOBAL (per role-family counts + weekly deltas) and
// identical for every user. Previously the dashboard re-fetched up to 5000
// active-job rows and re-bucketed them on EVERY page view, per user. Here we do
// that aggregation at most once per TTL window across the whole fleet and cache
// the small bucket result. The catalog only changes after the daily crawl, so a
// 30-minute TTL is comfortably fresh while eliminating the per-view megafetch.

const TTL_SECONDS = 30 * 60;
const MAX_ROWS = 5000;

async function fetchMarketBuckets(): Promise<MarketBuckets> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const thisWeekISO  = new Date(now - 7  * 24 * 3_600_000).toISOString();
  const priorWeekISO = new Date(now - 14 * 24 * 3_600_000).toISOString();

  const { data } = await admin
    .from("jobs")
    .select("title, tech_stack, role_function, created_at")
    .eq("is_active", true)
    .limit(MAX_ROWS);

  return aggregateMarketBuckets((data as MarketJobLite[] | null) ?? [], thisWeekISO, priorWeekISO);
}

const getCachedMarketBuckets = unstable_cache(
  fetchMarketBuckets,
  ["dashboard-market-buckets-v1"],
  { revalidate: TTL_SECONDS, tags: ["market-buckets"] },
);

/**
 * Cached, fleet-wide market buckets for the dashboard market-intelligence
 * panel. Never throws — a cache/DB hiccup degrades to empty buckets so the
 * dashboard still renders.
 */
export async function getMarketBuckets(): Promise<MarketBuckets> {
  try {
    return await getCachedMarketBuckets();
  } catch {
    return { totals: {}, thisWeek: {}, priorWeek: {} };
  }
}
