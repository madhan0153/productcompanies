// Read-only snapshot of the existing user's full dashboard state.
// Used to ground UI redesign decisions in the actual data shape.

import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(path.resolve("apps/web/.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
function q(table, search) {
  return fetch(`${URL}/rest/v1/${table}${search}`, { headers }).then(async (r) => {
    const text = await r.text();
    if (!r.ok) return { ok: false, status: r.status, body: text };
    return { ok: true, status: r.status, data: JSON.parse(text) };
  });
}
function head(s, n = 120) { return (s ?? "").toString().slice(0, n).replace(/\n/g, " "); }
function pct(n, d) { return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(0)}%`; }

console.log("\n══════ USER DASHBOARD SNAPSHOT ══════\n");

// 1) Profile (everything visible on /profile + used by matching)
const profile = await q("profiles", "?select=*&order=last_match_compute_at.desc.nullslast&limit=1").then(r => r.data?.[0]);
if (!profile) { console.error("no profile"); process.exit(1); }
console.log("── PROFILE ──");
const profileCols = [
  "id", "years_experience", "seniority", "target_role_functions", "preferred_hubs",
  "current_lpa", "target_lpa", "tech_stack",
  "resume_storage_path", "resume_score", "resume_score_at",
  "resume_embedding_at", "resume_signature", "last_match_compute_at",
  "consents",
];
for (const c of profileCols) {
  const v = profile[c];
  console.log(`  ${c.padEnd(28)} : ${typeof v === "object" ? JSON.stringify(v).slice(0, 90) : head(String(v ?? "null"))}`);
}
console.log(`  resume_parsed sample fields : current_role="${profile.resume_parsed?.current_role}", role_function="${profile.resume_parsed?.role_function}", product_dna_score=${profile.resume_parsed?.product_dna_score}, companies=${profile.resume_parsed?.companies?.length ?? 0}, products_built=${profile.resume_parsed?.products_built?.length ?? 0}`);

const uid = profile.id;

// 2) Matches — counts by verdict, band, dimension
const m = await q("matches", `?select=score,verdict,confidence,hard_cap_reason,feedback_adjustment,tech_coverage,score_breakdown,fit_card,fit_card_at,user_hidden,hidden_reason,seen_at,jobs(id,title,companies(name,slug))&user_id=eq.${uid}&order=score.desc&limit=2000`);
const matches = m.ok ? m.data : [];
console.log(`\n── MATCHES (${matches.length} rows) ──`);

const verdictCounts = {}, bandCounts = { excellent:0, strong:0, plausible:0, weak:0, reject:0 };
const companyCounts = {}, capCounts = {};
let withFitCard = 0, withConfidence = 0, withTechCov = 0;
let hidden = 0, mismatched = 0, unseen = 0, sumScore = 0, sumConf = 0;
const top10 = [];
for (const r of matches) {
  sumScore += r.score ?? 0;
  if (r.score >= 90) bandCounts.excellent++;
  else if (r.score >= 75) bandCounts.strong++;
  else if (r.score >= 60) bandCounts.plausible++;
  else if (r.score >= 40) bandCounts.weak++;
  else bandCounts.reject++;
  verdictCounts[r.verdict ?? "null"] = (verdictCounts[r.verdict ?? "null"] ?? 0) + 1;
  const c = r.jobs?.companies?.name ?? "unknown";
  companyCounts[c] = (companyCounts[c] ?? 0) + 1;
  if (r.hard_cap_reason) capCounts[r.hard_cap_reason] = (capCounts[r.hard_cap_reason] ?? 0) + 1;
  if (r.fit_card) withFitCard++;
  if (r.confidence != null) { withConfidence++; sumConf += r.confidence; }
  if (r.tech_coverage) withTechCov++;
  if (r.user_hidden) hidden++;
  if (r.hidden_reason === "mismatch") mismatched++;
  if (r.seen_at === null) unseen++;
  if (top10.length < 10) top10.push(r);
}
console.log(`  avg score: ${(sumScore / matches.length).toFixed(1)}, avg confidence: ${(sumConf / Math.max(withConfidence,1)).toFixed(1)}`);
console.log(`  bands     : excellent=${bandCounts.excellent} strong=${bandCounts.strong} plausible=${bandCounts.plausible} weak=${bandCounts.weak} reject=${bandCounts.reject}`);
console.log(`  verdicts  : ${Object.entries(verdictCounts).map(([k,v])=>`${k}=${v}`).join(" ")}`);
console.log(`  hidden=${hidden} (user-dismissed), mismatch hidden_reason=${mismatched}, unseen seen_at=null=${unseen}`);
console.log(`  with Fit Card=${withFitCard} (${pct(withFitCard, matches.length)}), confidence=${withConfidence} (${pct(withConfidence, matches.length)}), tech_coverage=${withTechCov} (${pct(withTechCov, matches.length)})`);
console.log(`  caps fired: ${Object.entries(capCounts).map(([k,v])=>`${k}=${v}`).join(" ") || "(none)"}`);
console.log(`  top company by row count: ${Object.entries(companyCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}=${v}`).join(", ")}`);

console.log("\n  top 10 matches:");
for (const r of top10) {
  console.log(`    ${Math.round(r.score).toString().padStart(3)} ${r.verdict?.padEnd(15)} conf=${r.confidence ?? "·"} cap=${r.hard_cap_reason ?? "·"} fitcard=${r.fit_card ? "Y" : "N"} hidden=${r.user_hidden ? "Y" : "N"} | ${head(r.jobs?.title, 50)} @ ${r.jobs?.companies?.name}`);
}

// 3) Applications
const apps = await q("applications", `?select=id,status,applied_at,jobs(title,companies(name))&user_id=eq.${uid}&order=updated_at.desc`);
console.log(`\n── APPLICATIONS (${apps.data?.length ?? 0} rows) ──`);
const statusCounts = {};
for (const a of apps.data ?? []) {
  statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
}
console.log(`  status: ${Object.entries(statusCounts).map(([k,v])=>`${k}=${v}`).join(" ") || "(none — user hasn't acted on any job)"}`);
for (const a of (apps.data ?? []).slice(0, 5)) {
  console.log(`    [${a.status}] ${head(a.jobs?.title, 50)} @ ${a.jobs?.companies?.name}`);
}

// 4) Coach + tailored resumes + memos
const coach = await q("coach_outputs", `?select=id,kind,generated_at&user_id=eq.${uid}&order=generated_at.desc&limit=5`);
const tailored = await q("tailored_resumes", `?select=id,generated_at,job_id,jobs(title,companies(name))&user_id=eq.${uid}&order=generated_at.desc&limit=5`);
const memos = await q("negotiation_memos", `?select=id,generated_at,job_id&user_id=eq.${uid}&order=generated_at.desc&limit=5`);
console.log(`\n── ARTIFACTS ──`);
console.log(`  coach outputs    : ${coach.data?.length ?? 0}${coach.ok ? "" : " (table missing)"}`);
console.log(`  tailored resumes : ${tailored.data?.length ?? 0}`);
for (const t of tailored.data ?? []) console.log(`     ${t.generated_at} → ${head(t.jobs?.title, 50)} @ ${t.jobs?.companies?.name}`);
console.log(`  negotiation memos: ${memos.data?.length ?? 0}`);

// 5) Match recompute stats
const profileForCompute = await q("profiles", `?select=last_match_compute_at,resume_embedding_at,resume_signature&id=eq.${uid}`).then(r => r.data?.[0]);
console.log(`\n── COMPUTE STATE ──`);
console.log(`  last_match_compute_at : ${profileForCompute?.last_match_compute_at}`);
console.log(`  resume_embedding_at   : ${profileForCompute?.resume_embedding_at}`);
console.log(`  resume_signature      : ${profileForCompute?.resume_signature?.slice(0,16)}…`);

// 6) Jobs catalog reality
const totalJobs = await q("jobs", "?select=id&is_active=eq.true").then(r => r.data?.length ?? 0);
const jobsWithParse = await q("jobs", "?select=id&is_active=eq.true&jd_parsed_at=not.is.null").then(r => r.data?.length ?? 0);
const jobsWithEmbedding = await q("jobs", "?select=id&is_active=eq.true&embedding_at=not.is.null").then(r => r.data?.length ?? 0);
const jobsByCompany = await q("jobs", "?select=company_id,companies(name)&is_active=eq.true&limit=10000").then(r => r.data ?? []);
const companyJobCounts = {};
for (const j of jobsByCompany) companyJobCounts[j.companies?.name ?? "?"] = (companyJobCounts[j.companies?.name ?? "?"] ?? 0) + 1;
console.log(`\n── CATALOG ──`);
console.log(`  active jobs        : ${totalJobs}`);
console.log(`  with JD parsed     : ${jobsWithParse} (${pct(jobsWithParse, totalJobs)})`);
console.log(`  with embedding     : ${jobsWithEmbedding} (${pct(jobsWithEmbedding, totalJobs)})`);
console.log(`  jobs per company   :`);
for (const [k, v] of Object.entries(companyJobCounts).sort((a,b)=>b[1]-a[1])) {
  console.log(`     ${k.padEnd(15)} ${v}`);
}

console.log("\n═════════════════════════════════════\n");
