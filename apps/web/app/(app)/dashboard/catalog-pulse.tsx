// Sprint 6 — Catalog freshness indicator.
//
// Replaces "From this morning's crawl" hardcoded copy with a live read of
// crawl_runs. Tells the user when the catalog was last updated and when
// the next refresh is due, with a green/amber/red dot.
//
// Cadence assumption: daily crawl at 02:00 IST = 20:30 UTC.

import { Activity } from "lucide-react";

const DAILY_CRAWL_HOUR_UTC = 20.5; // 02:00 IST

function nextCrawlUtc(): Date {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), Math.floor(DAILY_CRAWL_HOUR_UTC), (DAILY_CRAWL_HOUR_UTC % 1) * 60));
  if (utc.getTime() < now.getTime()) utc.setUTCDate(utc.getUTCDate() + 1);
  return utc;
}

export function CatalogPulse({
  lastFinishedAt,
  activeJobCount,
}: {
  lastFinishedAt: string | null;
  activeJobCount: number;
}) {
  let ageStr = "—";
  let tone: "success" | "warning" | "destructive" = "warning";
  if (lastFinishedAt) {
    const ms = Date.now() - new Date(lastFinishedAt).getTime();
    const hrs = Math.max(0, ms / 3_600_000);
    if (hrs < 28)       { tone = "success";     ageStr = hrs < 1 ? "just now" : `${Math.round(hrs)}h ago`; }
    else if (hrs < 50)  { tone = "warning";     ageStr = `${Math.round(hrs)}h ago — refresh overdue`; }
    else                { tone = "destructive"; ageStr = `${Math.round(hrs / 24)}d ago — crawler may be down`; }
  } else {
    ageStr = "no crawl yet";
    tone = "destructive";
  }

  const next = nextCrawlUtc();
  const hrsToNext = Math.max(0, (next.getTime() - Date.now()) / 3_600_000);
  const dotCls =
    tone === "success" ? "bg-success"
    : tone === "warning" ? "bg-warning"
    : "bg-destructive";
  const textCls =
    tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : "text-destructive";

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" title={lastFinishedAt ?? undefined}>
      <Activity className={`h-3.5 w-3.5 ${textCls}`} aria-hidden />
      <span>
        <strong className="text-foreground tabular-nums">{activeJobCount.toLocaleString("en-IN")}</strong> active roles
        <span className="mx-1.5 text-muted-foreground/60">·</span>
        <span className={`inline-flex items-center gap-1 ${textCls}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} aria-hidden />
          catalog {ageStr}
        </span>
        {tone === "success" && hrsToNext < 24 && (
          <span className="text-muted-foreground/70"> · next refresh in {Math.round(hrsToNext)}h</span>
        )}
      </span>
    </div>
  );
}
