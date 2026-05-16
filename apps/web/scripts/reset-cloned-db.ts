// Full reset of the Supabase DB without going through the SQL editor.
// Wipes: storage objects in `resumes` + `tailored-resumes`, every auth.user
// (cascades to profiles, consents, matches, applications, interview_notes,
// stories, offers, digest_subscriptions, resume_versions, tailored_resumes,
// negotiation_memos), and the FK-independent tables (jobs, crawl_runs,
// dpdp_events). Companies are preserved (crawler needs them).
//
// usage:
//   pnpm --filter web exec tsx --require ./scripts/loadenv.cjs scripts/reset-cloned-db.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
console.log(`Target: ${SUPABASE_URL}`);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Storage: empty both buckets ──────────────────────────────────────────
async function clearBucket(bucket: string) {
  console.log(`  clearing bucket '${bucket}'…`);
  let total = 0;

  for (;;) {
    const { data: roots, error } = await admin.storage
      .from(bucket).list("", { limit: 1000, offset: 0 });
    if (error) { console.error(`    list root: ${error.message}`); return; }
    if (!roots || roots.length === 0) break;

    const keys: string[] = [];
    for (const entry of roots) {
      if (entry.id) { keys.push(entry.name); continue; }
      const { data: kids } = await admin.storage.from(bucket).list(entry.name, { limit: 1000 });
      for (const k of kids ?? []) if (k.id) keys.push(`${entry.name}/${k.name}`);
    }
    if (keys.length === 0) break;
    for (let i = 0; i < keys.length; i += 100) {
      const slice = keys.slice(i, i + 100);
      const { error: rmErr } = await admin.storage.from(bucket).remove(slice);
      if (rmErr) { console.error(`    remove: ${rmErr.message}`); return; }
      total += slice.length;
    }
    if (roots.length < 1000) break;
  }
  console.log(`    removed ${total} object${total === 1 ? "" : "s"}`);
}

async function clearStorage() {
  console.log("\n[1/4] Clearing storage buckets…");
  await clearBucket("resumes");
  await clearBucket("tailored-resumes");
}

// ── 2. auth.users — cascades to profile/matches/applications/etc ───────────
async function deleteAllUsers() {
  console.log("\n[2/4] Deleting all auth.users (cascade)…");
  let total = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) { console.error("  listUsers:", error.message); return; }
    const users = data.users;
    if (users.length === 0) break;
    for (const u of users) {
      // Hard delete (shouldSoftDelete=false) — soft delete leaves the auth.users
      // row in place and FK cascades never fire, so profiles/consents/etc. linger.
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id, false);
      if (delErr) console.warn(`  deleteUser(${u.email}):`, delErr.message);
      else total++;
    }
    if (users.length < 1000) break;
  }
  console.log(`  removed ${total} user${total === 1 ? "" : "s"}`);
}

// ── 3. Independent tables: jobs / crawl_runs / dpdp_events ──────────────────
// supabase-js can't TRUNCATE, but we can DELETE WHERE id is not the empty
// uuid (matches every real row). RLS is bypassed by service role.
async function clearTable(table: string, key = "id") {
  // Some tables (consents, dpdp_events) use composite keys / no id col.
  // We pass the key column name for those.
  const { error, count } = await admin
    .from(table)
    .delete({ count: "exact" })
    .neq(key, "00000000-0000-0000-0000-000000000000");
  if (error) console.error(`  ${table}:`, error.message);
  else console.log(`  ${table}: deleted ${count ?? 0}`);
}

async function clearIndependentTables() {
  console.log("\n[3/4] Clearing FK-independent tables…");
  await clearTable("jobs");
  await clearTable("crawl_runs");
  // dpdp_events has its own uuid id column.
  await clearTable("dpdp_events");
}

// ── 4. Verify ───────────────────────────────────────────────────────────────
async function verify() {
  console.log("\n[4/4] Verifying…");
  const tables = [
    "jobs", "matches", "applications", "interview_notes", "stories",
    "offers", "consents", "digest_subscriptions", "dpdp_events",
    "crawl_runs", "profiles", "resume_versions",
    "tailored_resumes", "negotiation_memos",
  ];
  for (const t of tables) {
    const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
    if (error) console.warn(`  ${t}: ${error.message}`);
    else console.log(`  ${t.padEnd(22)} = ${count ?? 0}`);
  }
  const { count: companies } = await admin.from("companies").select("*", { count: "exact", head: true });
  console.log(`  ─── preserved ───`);
  console.log(`  companies              = ${companies ?? 0} (expected 18)`);

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  console.log(`  auth.users (page 1)    = ${users.users.length}`);
}

async function main() {
  await clearStorage();
  await deleteAllUsers();
  await clearIndependentTables();
  await verify();
  console.log("\nDone. Fresh DB ready — trigger Daily Job Crawl to repopulate jobs.");
}

main().catch((e) => { console.error(e); process.exit(1); });
