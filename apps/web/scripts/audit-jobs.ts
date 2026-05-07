// Audit job-row quality across the 18 companies. Surfaces:
//   - % with non-trivial description
//   - % with apply_url
//   - rows that won't survive JD parse (description < 60 chars)
// Reproducible: same loadenv.cjs preload as diagnose-matches.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type Row = {
  id: string;
  title: string;
  description: string | null;
  apply_url: string | null;
  jd_parsed_at: string | null;
  is_active: boolean;
  companies: { name: string; slug: string } | null;
};

async function main() {
  // Pull everything active in pages of 1000.
  const all: Row[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, description, apply_url, jd_parsed_at, is_active, companies(name, slug)")
      .eq("is_active", true)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data as unknown as Row[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nTotal active jobs: ${all.length}\n`);

  const lengths = all.map((r) => (r.description ?? "").length);
  const buckets = {
    empty: lengths.filter((n) => n === 0).length,
    tiny:  lengths.filter((n) => n > 0 && n < 60).length,
    short: lengths.filter((n) => n >= 60 && n < 300).length,
    decent: lengths.filter((n) => n >= 300 && n < 800).length,
    full:  lengths.filter((n) => n >= 800).length,
  };
  const noApply = all.filter((r) => !r.apply_url || r.apply_url.length < 5).length;
  const parsed = all.filter((r) => r.jd_parsed_at !== null).length;

  console.log("Description length distribution");
  console.log("  empty (0)              :", buckets.empty.toString().padStart(5));
  console.log("  tiny (1-60)            :", buckets.tiny.toString().padStart(5));
  console.log("  short (60-300)         :", buckets.short.toString().padStart(5));
  console.log("  decent (300-800)       :", buckets.decent.toString().padStart(5));
  console.log("  full (800+)            :", buckets.full.toString().padStart(5));
  console.log();
  console.log("apply_url missing       :", `${noApply} / ${all.length}`);
  console.log("jd_parsed_at populated   :", `${parsed} / ${all.length}`);

  // By company
  console.log("\nPer-company breakdown:");
  console.log(`${"company".padEnd(14)} ${"#".padStart(5)} ${"emptyD".padStart(7)} ${"tinyD".padStart(6)} ${"avgLen".padStart(7)} ${"noApply".padStart(8)} ${"parsed".padStart(7)}`);
  console.log("─".repeat(70));

  const byCompany = new Map<string, Row[]>();
  for (const r of all) {
    const k = r.companies?.slug ?? "?";
    if (!byCompany.has(k)) byCompany.set(k, []);
    byCompany.get(k)!.push(r);
  }
  const sorted = [...byCompany.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [slug, rows] of sorted) {
    const lens = rows.map((r) => (r.description ?? "").length);
    const empty = lens.filter((n) => n === 0).length;
    const tiny = lens.filter((n) => n > 0 && n < 60).length;
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    const noU = rows.filter((r) => !r.apply_url || r.apply_url.length < 5).length;
    const par = rows.filter((r) => r.jd_parsed_at !== null).length;
    console.log(
      `${slug.padEnd(14)} ${String(rows.length).padStart(5)} ${String(empty).padStart(7)} ${String(tiny).padStart(6)} ${Math.round(avg).toString().padStart(7)} ${String(noU).padStart(8)} ${String(par).padStart(7)}`,
    );
  }

  // A handful of bad apples
  console.log("\nSample rows missing apply_url (first 5):");
  for (const r of all.filter((r) => !r.apply_url).slice(0, 5)) {
    console.log(`  ${r.companies?.slug ?? "?"}: ${r.title}`);
  }
  console.log("\nSample rows with empty description (first 5):");
  for (const r of all.filter((r) => !(r.description ?? "").length).slice(0, 5)) {
    console.log(`  ${r.companies?.slug ?? "?"}: ${r.title}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
