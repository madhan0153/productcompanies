// One-shot: clear last_match_compute_at on the most-recently-active profile
// so the next computeMatchesForUser() runs in full mode. Reversible — the
// next compute writes a fresh timestamp.

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

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };

// 1) Look up the target profile (single user in this DB right now).
const probe = await fetch(`${URL}/rest/v1/profiles?select=id,last_match_compute_at,resume_embedding_at&order=last_match_compute_at.desc.nullslast&limit=1`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
const profiles = await probe.json();
if (!Array.isArray(profiles) || profiles.length === 0) { console.error("no profile found"); process.exit(1); }
const target = profiles[0];
console.log("target profile:");
console.log("  id                    :", target.id);
console.log("  resume_embedding_at   :", target.resume_embedding_at);
console.log("  last_match_compute_at :", target.last_match_compute_at, "← about to clear");

// 2) PATCH the row.
const patch = await fetch(`${URL}/rest/v1/profiles?id=eq.${target.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ last_match_compute_at: null }),
});
const result = await patch.text();
if (!patch.ok) { console.error("patch failed", patch.status, result); process.exit(2); }
const updated = JSON.parse(result)[0];
console.log("\nafter patch:");
console.log("  last_match_compute_at :", updated.last_match_compute_at);
console.log("\n✓ next computeMatchesForUser() for this user will run in FULL mode.");
console.log("  Trigger it by visiting the matches page in the app, clicking Recompute,");
console.log("  or hitting the /api/matches/compute endpoint.");
