// Inline JD parse during crawl — Phase J.
//
// Sits between normalize and upsert. For each normalized job, decides:
//   - new row              → parse + embed
//   - existing parsed,
//     description unchanged → SKIP (signature is stable)
//   - existing parsed,
//     description changed   → re-parse + re-embed (signature flipped)
//   - existing unparsed     → parse + embed (legacy / failed-before)
//
// Concurrency: a worker pool of N (default 2 × num_keys) calls the shared
// `parseJobDescription` runner, which already does key rotation + 429
// backoff with retry-after. Per-key 429 doesn't block — runner rotates.
// All parses commit their structured fields back onto the NormalizedJob
// (extended). Embeddings batch at the end (Gemini accepts 100 contents /
// call → 35 calls instead of 3,500 for a fresh DB).
//
// Failure isolation: a parse error on one job leaves jd_parsed_at NULL on
// that row; the safety-net Vercel endpoint will retry it on the daily cron.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type NormalizedJob,
  parseJobDescription,
  embedBatch,
  buildJobEmbedText,
  type ParsedJD,
} from "@prodmatch/shared";
import { log } from "../lib/logger.js";

export interface EnrichedJob extends NormalizedJob {
  /** When set, upsert writes parse fields + embedding atomically with the row. */
  parsed?: ParsedJD;
  embedding?: number[];
  /** True if we should write parse fields (new or signature-changed row). */
  needsParse: boolean;
}

export interface ParseDecision {
  parse: NormalizedJob[];   // jobs that need parse + embed (new or changed)
  skip: NormalizedJob[];    // existing rows whose description didn't change
}

interface ExistingMeta {
  external_id: string;
  signature: string;
  jd_parsed_at: string | null;
}

const NUM_KEYS = (() => {
  const raw = process.env.GEMINI_API_KEY ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean).length || 1;
})();

// 2 workers per key keeps each key saturated without 429s under
// gemini-flash-lite-latest's per-key RPM. Capped at 9 total to leave
// embedBatch room.
const WORKERS = Math.min(NUM_KEYS * 2, 9);

const EMBED_BATCH = 100;

// ── Decision step ───────────────────────────────────────────────────────────

export function decideWork(
  jobs: NormalizedJob[],
  existing: Map<string, ExistingMeta>,
): ParseDecision {
  const parse: NormalizedJob[] = [];
  const skip: NormalizedJob[] = [];

  for (const j of jobs) {
    const ex = existing.get(j.external_id);
    if (!ex) {
      parse.push(j);
      continue;
    }
    // Already parsed AND signature unchanged → description is identical to
    // last crawl → no need to re-parse. The upsert will still bump
    // last_seen_at + write any normalized field updates.
    if (ex.jd_parsed_at && ex.signature === j.signature) {
      skip.push(j);
      continue;
    }
    // Either never parsed, or description changed materially → (re-)parse.
    parse.push(j);
  }
  return { parse, skip };
}

export async function fetchExistingMeta(
  supabase: SupabaseClient,
  companyId: string,
  externalIds: string[],
): Promise<Map<string, ExistingMeta>> {
  const map = new Map<string, ExistingMeta>();
  if (externalIds.length === 0) return map;

  // Page through to avoid PostgREST's IN-list limit on very large companies.
  const PAGE = 200;
  for (let i = 0; i < externalIds.length; i += PAGE) {
    const slice = externalIds.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("jobs")
      .select("external_id, signature, jd_parsed_at")
      .eq("company_id", companyId)
      .in("external_id", slice);
    if (error) {
      log(`fetchExistingMeta error: ${error.message}`, "warn");
      continue;
    }
    for (const r of (data as ExistingMeta[]) ?? []) {
      map.set(r.external_id, r);
    }
  }
  return map;
}

// ── Parse worker pool ───────────────────────────────────────────────────────

interface ParseStats {
  ok: number;
  err: number;
  errSamples: Array<{ title: string; reason: string }>;
}

async function parseWithWorkers(
  jobs: NormalizedJob[],
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error") => void,
): Promise<{ map: Map<string, ParsedJD>; stats: ParseStats }> {
  const map = new Map<string, ParsedJD>();
  const stats: ParseStats = { ok: 0, err: 0, errSamples: [] };
  if (jobs.length === 0) return { map, stats };

  const queue = [...jobs];
  const total = jobs.length;

  const worker = async (workerId: number) => {
    while (true) {
      const j = queue.shift();
      if (!j) return;
      // Pre-distribute keys across workers — the runner will still rotate
      // on 429, but starting each worker on a different key avoids the
      // "all 6 workers smash key 0 first" thundering herd.
      const startKeyIndex = workerId % NUM_KEYS;
      try {
        const parsed = await parseJobDescription(
          {
            title: j.title,
            description: j.description,
            seniority_hint: j.seniority,
          },
          { startKeyIndex, maxRateLimitWaitMs: 120_000 },
        );
        map.set(j.external_id, parsed);
        stats.ok++;
      } catch (err) {
        stats.err++;
        const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
        if (stats.errSamples.length < 5) {
          stats.errSamples.push({ title: j.title.slice(0, 60), reason: reason.slice(0, 140) });
        }
      }
      const done = stats.ok + stats.err;
      if (done % 25 === 0 || done === total) {
        cLog(`  parse: ${done}/${total} ok=${stats.ok} err=${stats.err}`);
      }
    }
  };

  cLog(`Parsing ${total} JD${total === 1 ? "" : "s"} with ${WORKERS} workers across ${NUM_KEYS} key${NUM_KEYS === 1 ? "" : "s"}…`);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  cLog(`Parse done: ok=${stats.ok} err=${stats.err} | ${Math.round((Date.now() - t0) / 1000)}s${companyName ? ` (${companyName})` : ""}`);
  if (stats.errSamples.length > 0) {
    for (const s of stats.errSamples) {
      cLog(`  parse err [${s.title}]: ${s.reason}`, "warn");
    }
  }
  return { map, stats };
}

// ── Batched embed step ──────────────────────────────────────────────────────

async function embedJobsBatched(
  jobs: NormalizedJob[],
  parsedMap: Map<string, ParsedJD>,
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error") => void,
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  const targets = jobs.filter((j) => parsedMap.has(j.external_id));
  if (targets.length === 0) return out;

  const t0 = Date.now();
  cLog(`Embedding ${targets.length} JDs in batches of ${EMBED_BATCH}…`);

  for (let i = 0; i < targets.length; i += EMBED_BATCH) {
    const slice = targets.slice(i, i + EMBED_BATCH);
    const texts = slice.map((j) => {
      const p = parsedMap.get(j.external_id)!;
      return buildJobEmbedText({
        title: j.title,
        company: companyName,
        jd_summary: p.jd_summary,
        must_have_skills: p.must_have_skills,
        nice_to_have_skills: p.nice_to_have_skills,
        description: j.description,
        role_function: p.role_function_jd,
        jd_seniority_signal: p.jd_seniority_signal,
        responsibilities: p.responsibilities,
        team_context: p.team_context,
      });
    });

    try {
      const vectors = await embedBatch(texts);
      for (let k = 0; k < slice.length; k++) {
        const v = vectors[k];
        if (v && v.length > 0) out.set(slice[k].external_id, v);
      }
      cLog(`  embed: ${Math.min(i + EMBED_BATCH, targets.length)}/${targets.length}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
      cLog(`  embed batch ${i}-${i + slice.length} failed: ${reason}`, "warn");
      // Soft-fail: jobs without embedding still get their parse fields written.
      // The semantic match falls back to a partial-credit score.
    }
  }

  cLog(`Embed done: ${out.size}/${targets.length} | ${Math.round((Date.now() - t0) / 1000)}s`);
  return out;
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function enrichWithParse(
  supabase: SupabaseClient,
  companyId: string,
  companyName: string,
  jobs: NormalizedJob[],
  cLog: (msg: string, level?: "info" | "warn" | "error") => void,
): Promise<EnrichedJob[]> {
  if (jobs.length === 0) return [];

  const existing = await fetchExistingMeta(
    supabase,
    companyId,
    jobs.map((j) => j.external_id),
  );

  const { parse, skip } = decideWork(jobs, existing);
  cLog(`Parse decision: ${parse.length} to parse, ${skip.length} skip (already parsed, unchanged)`);

  const { map: parsedMap } = await parseWithWorkers(parse, companyName, cLog);
  const embedMap = await embedJobsBatched(parse, parsedMap, companyName, cLog);

  // Stitch results back onto the original job list, preserving order.
  return jobs.map((j) => {
    const parsed = parsedMap.get(j.external_id);
    const needsParse = parse.some((p) => p.external_id === j.external_id) && Boolean(parsed);
    return {
      ...j,
      parsed,
      embedding: embedMap.get(j.external_id),
      needsParse,
    };
  });
}

// ── Dry-run helper for the 5-job preview ────────────────────────────────────

export async function dryRunParse(
  jobs: NormalizedJob[],
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error") => void,
  count = 5,
): Promise<void> {
  const sample = jobs.slice(0, count);
  cLog(`[DRY RUN] Parsing ${sample.length} sample JDs…`);
  const { map } = await parseWithWorkers(sample, companyName, cLog);
  for (const j of sample) {
    const p = map.get(j.external_id);
    console.log("\n" + "─".repeat(80));
    console.log(`TITLE:    ${j.title}`);
    console.log(`COMPANY:  ${companyName}`);
    console.log(`SIG:      ${j.signature.slice(0, 16)}…`);
    if (!p) {
      console.log("(parse failed)");
      continue;
    }
    console.log(`SUMMARY:  ${p.jd_summary}`);
    console.log(`FUNCTION: ${p.role_function_jd ?? "?"}    LEVEL: ${p.jd_seniority_signal ?? "?"}    YRS: ${p.jd_min_years ?? "?"}-${p.jd_max_years ?? "?"}    MODE: ${p.work_mode ?? "?"}`);
    if (p.team_context) console.log(`TEAM:     ${p.team_context}`);
    console.log(`MUST:     ${p.must_have_skills.join(", ") || "(none)"}`);
    console.log(`NICE:     ${p.nice_to_have_skills.join(", ") || "(none)"}`);
    if (p.responsibilities.length > 0) {
      console.log(`RESP:`);
      for (const r of p.responsibilities) console.log(`  • ${r}`);
    }
    if (p.qualifications_required.length > 0) {
      console.log(`QUAL-REQ: ${p.qualifications_required.join(" | ")}`);
    }
    if (p.qualifications_preferred.length > 0) {
      console.log(`QUAL-PREF: ${p.qualifications_preferred.join(" | ")}`);
    }
    if (p.tech_stack_explicit.length > 0) {
      console.log(`TECH:     ${p.tech_stack_explicit.join(", ")}`);
    }
    if (p.is_boilerplate) {
      console.log(`⚠ BOILERPLATE: ${p.ghost_reasons.join(", ")}`);
    }
  }
  console.log("\n" + "─".repeat(80));
}
