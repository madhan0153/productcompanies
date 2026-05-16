// Sprint 3 — Item 11. Per-company crawl-drift alerting.
//
// After every crawl run for a company, check the last 2 runs (including
// the one we just recorded). If both are partial / failed, the scraper is
// almost certainly broken — selector drift, captcha, network blip, ATS
// API change. Fire a webhook so an operator sees it within minutes
// instead of noticing 3 days later when matches go stale.
//
// CRAWL_ALERT_WEBHOOK_URL env var:
//   - Discord:  https://discord.com/api/webhooks/...  (uses { content: "msg" })
//   - Slack:    https://hooks.slack.com/services/...  (also accepts { text: "msg" }
//                                                       OR { content: "msg" } via
//                                                       compatibility — we send
//                                                       both keys to be safe)
//   - Custom:   any POST endpoint accepting JSON
//
// If the env var isn't set, the function is a no-op. We never block the
// crawler on a webhook failure.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DriftCheckInput {
  /** This run's outcome — `failed` always alerts; `partial` alerts only when
   *  the previous run was also partial/failed. */
  thisStatus: "success" | "partial" | "failed";
  companyId: string;
  companyName: string;
  companySlug: string;
  /** Anything actionable about THIS run — e.g. "saw 11 of 47 active (23%)". */
  detailLine: string;
}

interface CrawlRunRow {
  status: "running" | "success" | "partial" | "failed";
  finished_at: string | null;
}

const WEBHOOK_TIMEOUT_MS = 4_000;

export async function maybeFireDriftAlert(
  supabase: SupabaseClient,
  input: DriftCheckInput,
): Promise<{ fired: boolean; reason: string | null }> {
  const webhook = process.env.CRAWL_ALERT_WEBHOOK_URL?.trim();
  if (!webhook) return { fired: false, reason: "no_webhook_configured" };

  // Look back at the last 2 completed runs for this company (most recent
  // first, excluding any still 'running' rows).
  const { data, error } = await supabase
    .from("crawl_runs")
    .select("status, finished_at")
    .eq("company_id", input.companyId)
    .neq("status", "running")
    .order("finished_at", { ascending: false })
    .limit(2);

  if (error) {
    return { fired: false, reason: `crawl_runs query failed: ${error.message}` };
  }

  const recent = ((data ?? []) as CrawlRunRow[]).map((r) => r.status);

  // Failure rules:
  //   - thisStatus === 'failed' → ALWAYS alert (catastrophic).
  //   - thisStatus === 'partial' AND previous was also partial/failed → alert.
  //   - thisStatus === 'success' → no-op (recovery).
  let shouldFire = false;
  let reason = "";
  if (input.thisStatus === "failed") {
    shouldFire = true;
    reason = "this run failed";
  } else if (input.thisStatus === "partial") {
    const prev = recent[1];
    if (prev === "partial" || prev === "failed") {
      shouldFire = true;
      reason = `partial twice in a row (prev=${prev})`;
    }
  }

  if (!shouldFire) return { fired: false, reason: "healthy" };

  const message =
    `🚨 ProdMatch crawler drift — ${input.companyName} (${input.companySlug})\n` +
    `Status: \`${input.thisStatus}\` · ${reason}\n` +
    `${input.detailLine}`;

  // Discord requires `content`; Slack accepts `text`. Send both so the same
  // webhook URL works either way without per-platform branching.
  const body = JSON.stringify({ content: message, text: message });

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { fired: false, reason: `webhook returned ${res.status}` };
    }
    return { fired: true, reason };
  } catch (err) {
    return { fired: false, reason: `webhook fetch failed: ${(err as Error).message}` };
  }
}
