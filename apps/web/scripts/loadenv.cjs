// Preloaded via tsx --require so env vars are set before any TS module
// (which can transitively import lib/env.ts at top level) is evaluated.
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const candidates = [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "apps", "web", ".env.local"),
  resolve(__dirname, "..", ".env.local"),
];

for (const path of candidates) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    if (process.env[k]) continue;
    process.env[k] = vRaw.replace(/^["']|["']$/g, "");
  }
  process.stderr.write(`[loadenv] loaded ${path}\n`);
  break;
}
