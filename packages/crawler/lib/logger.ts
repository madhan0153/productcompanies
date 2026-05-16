// Structured JSON logger for the crawler.
//
// Emits one JSON object per line to stdout/stderr — easy to ingest into
// any log aggregator (Datadog, Logflare, Loki) without parsing free-text.
// In dev / human use, the GH Actions UI still renders it readably.
//
// Every line carries:
//   • ts        — ISO timestamp
//   • level     — info | warn | error
//   • runId     — workflow run id (or 'local' when run outside CI)
//   • company   — slug if invoked via `makeLogger(slug)`, else null
//   • msg       — human-readable message
//   • event     — optional structured event tag (e.g. "parse_done")
//   • data      — optional structured fields
//
// Backwards-compat: `log(msg)` and `log(msg, level)` both still work.
// `makeLogger(company)` still returns a function with the same shape.

type Level = "info" | "warn" | "error";

interface LogRecord {
  ts: string;
  level: Level;
  runId: string;
  company: string | null;
  msg: string;
  event?: string;
  data?: Record<string, unknown>;
}

const RUN_ID = (
  process.env.CRAWL_RUN_ID ||
  process.env.GITHUB_RUN_ID ||
  "local"
);

function emit(rec: LogRecord): void {
  const line = JSON.stringify(rec);
  if (rec.level === "error") {
    console.error(line);
  } else if (rec.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function log(
  msg: string,
  level: Level = "info",
  extra?: { event?: string; data?: Record<string, unknown> },
): void {
  emit({
    ts: new Date().toISOString(),
    level,
    runId: RUN_ID,
    company: null,
    msg,
    ...(extra?.event ? { event: extra.event } : {}),
    ...(extra?.data ? { data: extra.data } : {}),
  });
}

/**
 * Per-company logger. Returns a function with the same call shape as `log`
 * but stamped with the company slug. Used by `makeLogger("amazon")(...)`.
 */
export function makeLogger(company: string) {
  return (
    msg: string,
    level: Level = "info",
    extra?: { event?: string; data?: Record<string, unknown> },
  ): void => {
    emit({
      ts: new Date().toISOString(),
      level,
      runId: RUN_ID,
      company,
      msg,
      ...(extra?.event ? { event: extra.event } : {}),
      ...(extra?.data ? { data: extra.data } : {}),
    });
  };
}

export const RUN_ID_VALUE = RUN_ID;
