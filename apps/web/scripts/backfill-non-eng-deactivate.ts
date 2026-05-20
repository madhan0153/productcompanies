// Sprint 2 — Item 17.
//
// One-shot backfill: deactivate any active job whose title now matches the
// non-engineering regex shipped in Sprint 0 (packages/crawler/pipeline/
// job-filter.ts). Without this, the first crawl after deploying the new
// filter will see hundreds of previously-active rows fall out of the
// "seen" set and the 60% coverage guard may trip for companies that
// historically posted many non-engineering roles (Amazon, Microsoft).
//
// Safe to re-run. The filter is conservative — it only matches titles that
// are obviously HR / finance / sales / EHS / admin / facilities / non-tech
// support. Engineering roles never match.
//
// Usage (from apps/web/):
//   pnpm exec tsx --require ./scripts/loadenv.cjs scripts/backfill-non-eng-deactivate.ts
//
//   Add `--dry-run` to print what would be deactivated without writing.

import { createClient } from "@supabase/supabase-js";

// Inlined from packages/crawler/pipeline/job-filter.ts — kept in sync by hand
// because this script lives in the web tsconfig and we don't want to cross
// workspace boundaries just for a one-shot script.
const NON_ENGINEERING_TITLE_PATTERNS: RegExp[] = [
  /\b(accountant|accounts|finance|financial|f&a|fp&?a|taxation|payroll|billing|invoice|audit)\b/i,
  /\b(hr|human\s*resource|talent\s*acquisition|recruiter|recruitment|people\s*partner|industrial\s*relation)\b/i,
  /\b(legal\s*counsel|compliance\s*officer|contract\s*manager|paralegal|lawyer|advocate)\b/i,
  /\b(account\s*executive|sales\s*(executive|representative|manager|rep)|business\s*development\s*(manager|representative)|sdr|bdr|crm\s*(executive|admin)|inside\s*sales)\b/i,
  /\b(marketing\s*(manager|executive|specialist)|brand\s*manager|pr\s*manager|content\s*writer|copywriter|seo\s*(specialist|executive))\b/i,
  /\b(store\s*(manager|executive|incharge|supervisor)|storekeeper|warehouse\s*(manager|associate)|logistics\s*(executive|coordinator)|supply\s*chain\s*(executive|analyst))\b/i,
  /\b(ehs|hse|health\s*&?\s*safety|environment.*safety|safety\s*officer)\b/i,
  /\b(facility|housekeeping|horticulture|travel\s*desk|canteen|reception(ist)?)\b/i,
  /\b(office\s*(assistant|manager|admin)|admin\s*assistant|peon|driver|chauffeur|secretary)\b/i,
  /\b(customer\s*support|support\s*executive|call\s*center|tele(caller|sales|marketing))\b/i,
];

function isNonEngineeringTitle(title: string): boolean {
  if (!title) return false;
  return NON_ENGINEERING_TITLE_PATTERNS.some((re) => re.test(title));
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const PAGE = 1000;

async function main() {
  console.log(`Scanning active jobs for non-engineering titles${dryRun ? " (DRY RUN)" : ""}…`);

  const toDeactivate: Array<{ id: string; title: string; company_id: string }> = [];
  const byCompany = new Map<string, number>();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company_id")
      .eq("is_active", true)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (isNonEngineeringTitle(row.title)) {
        toDeactivate.push(row);
        byCompany.set(row.company_id, (byCompany.get(row.company_id) ?? 0) + 1);
      }
    }
    if (data.length < PAGE) break;
  }

  console.log(`Found ${toDeactivate.length} active job(s) matching non-engineering filter.`);
  if (toDeactivate.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Surface the per-company breakdown so the operator can sanity-check
  // before deactivating. If any single company would lose >60% of its
  // active set, that's a sign the filter is too aggressive — bail.
  const { data: companyCounts } = await supabase
    .from("jobs")
    .select("company_id, companies(name)", { count: "exact" })
    .eq("is_active", true);

  const activeByCo = new Map<string, number>();
  for (const r of (companyCounts as Array<{ company_id: string; companies: { name: string } | null }> | null) ?? []) {
    activeByCo.set(r.company_id, (activeByCo.get(r.company_id) ?? 0) + 1);
  }
  const companyNames = new Map<string, string>();
  for (const r of (companyCounts as Array<{ company_id: string; companies: { name: string } | null }> | null) ?? []) {
    if (r.companies) companyNames.set(r.company_id, r.companies.name);
  }

  console.log("\nPer-company impact:");
  const rows = [...byCompany.entries()]
    .map(([cid, n]) => ({
      company: companyNames.get(cid) ?? cid.slice(0, 8),
      hits: n,
      active: activeByCo.get(cid) ?? 0,
      pct: activeByCo.get(cid) ? Math.round((n / activeByCo.get(cid)!) * 100) : 0,
    }))
    .sort((a, b) => b.hits - a.hits);

  for (const r of rows) {
    const flag = r.pct > 60 ? " ⚠ >60%" : "";
    console.log(`  ${r.company.padEnd(20)} ${String(r.hits).padStart(4)} of ${r.active.toString().padStart(4)} active  (${r.pct}%)${flag}`);
  }

  const dangerous = rows.find((r) => r.pct > 60);
  if (dangerous && !process.argv.includes("--force")) {
    console.error(`\nAborting — ${dangerous.company} would lose ${dangerous.pct}% of its active jobs.`);
    console.error("Re-run with --force if this is expected.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    console.log("First 10 sample titles that would be deactivated:");
    for (const r of toDeactivate.slice(0, 10)) {
      console.log(`  ${r.title}`);
    }
    return;
  }

  // Chunked update — Postgres IN-list practical limit, plus avoids any
  // single statement blowing past Supabase's row limit.
  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < toDeactivate.length; i += CHUNK) {
    const ids = toDeactivate.slice(i, i + CHUNK).map((r) => r.id);
    const { error } = await supabase
      .from("jobs")

      .update({ is_active: false } as any)
      .in("id", ids);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    done += ids.length;
    process.stdout.write(`  deactivated ${done}/${toDeactivate.length}…\r`);
  }
  console.log(`\nDone. Deactivated ${toDeactivate.length} non-engineering job(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
