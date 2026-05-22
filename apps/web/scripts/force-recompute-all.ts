// One-shot admin: force a FULL match recompute for every user whose
// resume has been parsed + embedded. Use after shipping a scoring change
// (Phase L semantic + AWS-family fixes) so cached match rows are
// rewritten with the new logic and stale verdicts (e.g. strong_fit @
// score 59 from before reconcileVerdictWithScore landed) get cleared.
//
// Idempotent — safe to re-run. Each user is processed serially to keep
// Gemini quota usage predictable.
//
// Run: cd apps/web && npx tsx scripts/force-recompute-all.ts
//
// Optional single-user form: npx tsx scripts/force-recompute-all.ts <user_id>

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const explicitUserId = process.argv[2] ?? null;

const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const ids: string[] = explicitUserId ? [explicitUserId] : await pickAll();
  console.log(`Recomputing matches for ${ids.length} user(s)…`);

  const { computeMatchesForUser } = await import("../lib/matching/engine");

  let ok = 0;
  let fail = 0;
  for (const userId of ids) {
    const t0 = Date.now();
    try {
      const result = await computeMatchesForUser(userId, { forceFull: true });
      ok++;
      console.log(
        `  ✓ ${userId.slice(0, 8)} — ${result.total} matches, ${result.new_matches} new, ${result.with_fit_card} cards, ${Date.now() - t0}ms`,
      );
    } catch (err) {
      fail++;
      console.log(`  ✗ ${userId.slice(0, 8)} — ${(err as Error).message}`);
    }
  }
  console.log(`Done: ${ok} ok, ${fail} failed.`);
}

async function pickAll(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .not("resume_parsed", "is", null)
    .not("resume_embedding_at", "is", null);
  if (error) throw error;
  return (data ?? []).map((r: { id: string }) => r.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
