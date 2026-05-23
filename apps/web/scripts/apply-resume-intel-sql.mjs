#!/usr/bin/env node
// Resume Intelligence — extract the R1 SQL block so it can be pasted into
// Supabase Studio in one click.
//
// Why this script and not "apply directly"?
// The web app's env file only carries the service-role REST key, which can
// do DML but NOT DDL (CREATE TABLE / ALTER TYPE). Applying the new schema
// safely requires either:
//   - Supabase Studio SQL editor (recommended — paste this block, click Run)
//   - psql with the project's direct Postgres password (if you have it)
//
// usage:
//   node apps/web/scripts/apply-resume-intel-sql.mjs
//   # prints the SQL between the R1 markers to stdout.
//   # pipe to clipboard: ... | clip   (Windows)  |  pbcopy (macOS)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(__dirname, "../../../supabase/schema.sql");

const START = "-- Phase R1 — Resume Intelligence (USP)";
const END = "-- 8. SEED — 51 approved product companies";

const sql = readFileSync(SCHEMA, "utf8");
const s = sql.indexOf(START);
const e = sql.indexOf(END);
if (s < 0 || e < 0) {
  console.error("Could not find R1 markers in supabase/schema.sql");
  process.exit(1);
}
const block = sql.slice(s, e).trimEnd();

process.stderr.write(
  `\n──────────────────────────────────────────────────────────────────\n` +
  `Resume Intelligence (R1) — SQL ready to paste into Supabase Studio.\n` +
  `Open: Supabase Studio → SQL Editor → New query → paste below → Run.\n` +
  `Safe to re-run (idempotent).\n` +
  `──────────────────────────────────────────────────────────────────\n\n`,
);

process.stdout.write(block);
process.stdout.write("\n");
