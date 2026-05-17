// Sprint 6 validation — read-only health check over PostgREST.
// Usage: node scripts/validate-sprint6.mjs [userEmail]

import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("apps/web/.env.local");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const argEmail = process.argv[2] ?? null;

if (!URL || !KEY) { console.error("missing supabase env"); process.exit(2); }

function q(table, search = "") {
  return fetch(`${URL}/rest/v1/${table}${search}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/json", "Accept-Profile": "public" },
  }).then(async (r) => {
    const text = await r.text();
    if (!r.ok) return { ok: false, status: r.status, body: text };
    try { return { ok: true, status: r.status, data: JSON.parse(text) }; }
    catch { return { ok: true, status: r.status, data: text }; }
  });
}

function pct(n, d) { return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`; }
function head(s, n = 80) { return (s ?? "").toString().slice(0, n).replace(/\n/g, " "); }

// ───────────────────────────────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════════");
console.log(" Sprint 6 validation");
console.log("════════════════════════════════════════════════════════════\n");

// 1) Schema: did the new columns get added?
console.log("── 1. SCHEMA CHECK ─────────────────────────────────────────");
const schemaProbes = [
  ["jobs",    "quality_score",       "?select=id,quality_score,quality_reasons,quality_gated_at&limit=1"],
  ["matches", "confidence",          "?select=user_id,job_id,confidence,hard_cap_reason,tech_coverage,feedback_adjustment&limit=1"],
];
for (const [tbl, col, search] of schemaProbes) {
  const r = await q(tbl, search);
  if (r.ok) {
    console.log(`  ✓ ${tbl}.${col}  → readable (${r.data?.length ?? 0} sample row)`);
  } else {
    console.log(`  ✗ ${tbl}.${col}  → NOT YET ADDED   status=${r.status}  ${head(r.body, 120)}`);
  }
}

// 2) Jobs: quality_score distribution
console.log("\n── 2. JOBS: quality_score distribution ─────────────────────");
const jobs = await q("jobs", "?select=id,is_active,quality_score,quality_reasons&is_active=eq.true&limit=10000");
if (!jobs.ok) {
  console.log(`  ✗ couldn't read jobs: ${head(jobs.body, 200)}`);
} else {
  const rows = jobs.data;
  const buckets = { "100":0, "60-99":0, "40-59":0, "<40":0 };
  const reasonCounts = {};
  let withReasons = 0;
  for (const r of rows) {
    const s = r.quality_score ?? 100;
    if (s >= 100) buckets["100"]++;
    else if (s >= 60) buckets["60-99"]++;
    else if (s >= 40) buckets["40-59"]++;
    else buckets["<40"]++;
    if (Array.isArray(r.quality_reasons) && r.quality_reasons.length > 0) {
      withReasons++;
      for (const x of r.quality_reasons) reasonCounts[x] = (reasonCounts[x] ?? 0) + 1;
    }
  }
  console.log(`  active jobs: ${rows.length}`);
  console.log(`    quality 100      : ${buckets["100"]}  ${pct(buckets["100"], rows.length)}`);
  console.log(`    quality 60-99    : ${buckets["60-99"]}  ${pct(buckets["60-99"], rows.length)}`);
  console.log(`    quality 40-59    : ${buckets["40-59"]}  ${pct(buckets["40-59"], rows.length)}`);
  console.log(`    quality <40      : ${buckets["<40"]}    ${pct(buckets["<40"], rows.length)}  ← gated from feed`);
  console.log(`    rows with reasons: ${withReasons}`);
  if (Object.keys(reasonCounts).length > 0) {
    console.log(`    top reason codes :`);
    for (const [k, v] of Object.entries(reasonCounts).sort((a,b)=>b[1]-a[1]).slice(0, 8)) {
      console.log(`      ${k.padEnd(28)} ${v}`);
    }
  } else {
    console.log(`    (no quality_reasons populated yet — crawler hasn't run since Sprint 6 deploy)`);
  }
}

// 3) Profiles: pick a user
console.log("\n── 3. PROFILE LOOKUP ───────────────────────────────────────");
let profilesQuery = "?select=id,years_experience,seniority,target_role_functions,preferred_hubs,target_lpa,resume_embedding_at,last_match_compute_at,resume_signature&order=last_match_compute_at.desc.nullslast&limit=5";
const profiles = await q("profiles", profilesQuery);
if (!profiles.ok) { console.log(`  ✗ ${head(profiles.body, 200)}`); process.exit(1); }
console.log(`  found ${profiles.data.length} profile row(s); showing the most-recent computes`);
for (const p of profiles.data) {
  console.log(`    id=${p.id.slice(0,8)}  yrs=${p.years_experience}  sen=${p.seniority}  targets=${(p.target_role_functions ?? []).join(",")}`);
  console.log(`      hubs=${(p.preferred_hubs ?? []).join(",")}  target_lpa=${p.target_lpa}`);
  console.log(`      resume_embedded_at=${p.resume_embedding_at}  last_match_compute=${p.last_match_compute_at}`);
}

let targetUser = profiles.data[0];
if (argEmail) {
  // Look up by email via auth.users (cross-schema; PostgREST exposes auth as separate)
  const u = await fetch(`${URL}/rest/v1/rpc/email_to_uid_dummy`, { method:"POST", headers: { apikey:KEY, Authorization:`Bearer ${KEY}`, "Content-Type":"application/json" }, body: JSON.stringify({ email: argEmail }) });
  void u; // not exposing auth.users by RPC; falling back to most-recent-compute.
}
if (!targetUser) { console.log("  ✗ no profiles found"); process.exit(1); }

console.log(`\n  → validating against user ${targetUser.id}`);

// 4) Matches for that user — counts + new column health
console.log("\n── 4. MATCHES: row counts + new-column health ──────────────");
const m = await q("matches", `?select=job_id,score,verdict,confidence,hard_cap_reason,tech_coverage,feedback_adjustment,score_breakdown,fit_card_at,user_hidden,hidden_reason,seen_at,computed_at&user_id=eq.${targetUser.id}&order=score.desc&limit=2000`);
if (!m.ok) { console.log(`  ✗ ${head(m.body, 200)}`); process.exit(1); }
const matches = m.data;
console.log(`  total matches: ${matches.length}`);

if (matches.length === 0) {
  console.log("  ⚠ no matches computed yet for this user.");
  console.log("    Trigger compute via apps/web/app/api/matches/compute (POST) or run the cron.");
  process.exit(0);
}

// Sprint 6 column population
let withConf = 0, withHardCap = 0, withTechCov = 0, withFb = 0, withBreakdown = 0, withFitCard = 0, hardMismatched = 0, hidden = 0;
const verdictCounts = {}, capReasonCounts = {}, bandCounts = {"excellent":0,"strong":0,"plausible":0,"weak":0,"reject":0};
let sumScore = 0, sumConf = 0, sumFb = 0, fbNonzero = 0;
let maxScore = 0, minScore = 100;
for (const r of matches) {
  const s = r.score ?? 0;
  sumScore += s; maxScore = Math.max(maxScore, s); minScore = Math.min(minScore, s);
  if (typeof r.confidence === "number") { withConf++; sumConf += r.confidence; }
  if (r.hard_cap_reason)         { withHardCap++; capReasonCounts[r.hard_cap_reason] = (capReasonCounts[r.hard_cap_reason] ?? 0) + 1; }
  if (r.tech_coverage)           withTechCov++;
  if (typeof r.feedback_adjustment === "number") { withFb++; sumFb += r.feedback_adjustment; if (Math.abs(r.feedback_adjustment) >= 0.1) fbNonzero++; }
  if (r.score_breakdown)         withBreakdown++;
  if (r.fit_card_at)             withFitCard++;
  if (r.hidden_reason === "mismatch") hardMismatched++;
  if (r.user_hidden)             hidden++;
  verdictCounts[r.verdict ?? "null"] = (verdictCounts[r.verdict ?? "null"] ?? 0) + 1;
  if (s >= 90) bandCounts.excellent++;
  else if (s >= 75) bandCounts.strong++;
  else if (s >= 60) bandCounts.plausible++;
  else if (s >= 40) bandCounts.weak++;
  else bandCounts.reject++;
}
const avgScore = (sumScore / matches.length).toFixed(1);
const avgConf  = withConf > 0 ? (sumConf / withConf).toFixed(1) : "n/a";
const avgFb    = withFb > 0 ? (sumFb / withFb).toFixed(2) : "n/a";

console.log(`  score:                 min=${minScore.toFixed(0)}  avg=${avgScore}  max=${maxScore.toFixed(0)}`);
console.log(`  verdict distribution:  ${Object.entries(verdictCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);
console.log(`  band distribution:     excellent=${bandCounts.excellent}  strong=${bandCounts.strong}  plausible=${bandCounts.plausible}  weak=${bandCounts.weak}  reject=${bandCounts.reject}`);
console.log("");
console.log(`  Sprint 6 population (% of ${matches.length} rows):`);
console.log(`    confidence            ${withConf.toString().padStart(4)}  ${pct(withConf, matches.length)}    avg=${avgConf}`);
console.log(`    hard_cap_reason       ${withHardCap.toString().padStart(4)}  ${pct(withHardCap, matches.length)}    breakdown: ${Object.entries(capReasonCounts).map(([k,v])=>`${k}=${v}`).join(", ") || "(none capped)"}`);
console.log(`    tech_coverage         ${withTechCov.toString().padStart(4)}  ${pct(withTechCov, matches.length)}`);
console.log(`    feedback_adjustment   ${withFb.toString().padStart(4)}  ${pct(withFb, matches.length)}    avg=${avgFb}  nonzero=${fbNonzero}`);
console.log(`  Legacy population:`);
console.log(`    score_breakdown       ${withBreakdown.toString().padStart(4)}  ${pct(withBreakdown, matches.length)}`);
console.log(`    fit_card_at           ${withFitCard.toString().padStart(4)}  ${pct(withFitCard, matches.length)}`);
console.log(`    hidden (mismatch)     ${hardMismatched}`);
console.log(`    user_hidden           ${hidden}`);

// 5) Sample top + bottom rows for spot-checking
console.log("\n── 5. SAMPLE ROWS (top 5 + bottom 5 by score) ──────────────");
const sorted = [...matches].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
const sample = [...sorted.slice(0, 5), ...sorted.slice(-5)];
const jobIds = [...new Set(sample.map((s) => s.job_id))];
const jobLookup = await q("jobs", `?select=id,title,companies(name),quality_score,quality_reasons,must_have_skills,seniority,description&id=in.(${jobIds.join(",")})`);
const jobMap = new Map((jobLookup.ok ? jobLookup.data : []).map((j) => [j.id, j]));
console.log("  (top 5)");
for (let i = 0; i < Math.min(5, sample.length); i++) {
  const r = sample[i];
  const j = jobMap.get(r.job_id);
  const company = j?.companies?.name ?? "?";
  console.log(`    ${(r.score ?? 0).toFixed(0).padStart(3)}  conf=${r.confidence ?? "·"}  fb=${r.feedback_adjustment ?? 0}  cap=${r.hard_cap_reason ?? "·"}  ${head(j?.title, 50).padEnd(50)} @ ${company}`);
  if (r.tech_coverage) {
    const tc = typeof r.tech_coverage === "string" ? JSON.parse(r.tech_coverage) : r.tech_coverage;
    console.log(`         tech: direct=${(tc.direct ?? []).length} adjacent=${(tc.adjacent ?? []).length} missing=${(tc.missing ?? []).length}`);
    if ((tc.adjacent ?? []).length > 0) {
      const sampleAdj = tc.adjacent.slice(0, 3).map((a) => `${a.jdSkill}(via ${a.via})`).join(", ");
      console.log(`         adjacent sample: ${sampleAdj}`);
    }
    if ((tc.missing ?? []).length > 0) {
      console.log(`         missing sample:  ${tc.missing.slice(0, 5).join(", ")}`);
    }
  }
}
if (sample.length > 5) {
  console.log("  (bottom 5)");
  for (let i = 5; i < sample.length; i++) {
    const r = sample[i];
    const j = jobMap.get(r.job_id);
    const company = j?.companies?.name ?? "?";
    console.log(`    ${(r.score ?? 0).toFixed(0).padStart(3)}  conf=${r.confidence ?? "·"}  fb=${r.feedback_adjustment ?? 0}  cap=${r.hard_cap_reason ?? "·"}  ${head(j?.title, 50).padEnd(50)} @ ${company}`);
  }
}

// 6) Quality gate active? Any jobs with score <40 in this user's matches? (shouldn't be — engine filters them)
console.log("\n── 6. QUALITY GATE: are sub-threshold jobs leaking into matches? ─");
let lowQualityInFeed = 0;
for (const r of sample) {
  const j = jobMap.get(r.job_id);
  if (j && typeof j.quality_score === "number" && j.quality_score < 40) lowQualityInFeed++;
}
console.log(`  sub-40 quality jobs in this user's sampled matches: ${lowQualityInFeed} (expected: 0)`);

// 7) Latest crawl_runs — did the crawler run since the deploy?
console.log("\n── 7. CRAWL RUNS: most recent ──────────────────────────────");
const cr = await q("crawl_runs", "?select=company_id,started_at,finished_at,jobs_seen,jobs_new,jobs_updated,jobs_marked_stale,status&order=started_at.desc&limit=5");
if (cr.ok) {
  for (const r of cr.data) {
    console.log(`    ${r.started_at}  status=${r.status}  seen=${r.jobs_seen}  new=${r.jobs_new}  updated=${r.jobs_updated}  stale=${r.jobs_marked_stale}`);
  }
} else {
  console.log(`  ✗ ${head(cr.body, 120)}`);
}

console.log("\n════════════════════════════════════════════════════════════\n");
