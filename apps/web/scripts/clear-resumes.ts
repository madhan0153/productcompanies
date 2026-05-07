// Empty the `resumes` Supabase Storage bucket via the admin API.
// Supabase blocks direct DELETE FROM storage.objects from SQL, so we go
// through the Storage REST endpoint via supabase-js (service-role client).
//
// usage: pnpm --filter web exec tsx --require ./scripts/loadenv.cjs scripts/clear-resumes.ts
//
// or with the bundled crawler tsx if pnpm exec doesn't find it:
//   /path/to/packages/crawler/node_modules/.bin/tsx --require ./scripts/loadenv.cjs scripts/clear-resumes.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "resumes";
const PAGE = 1000;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  let totalDeleted = 0;
  // Walk every user's folder. The bucket layout is `{user_uuid}/{filename}`,
  // so listing the bucket root yields per-user folder entries; recurse into
  // each. We could use the recursive list option but explicit is safer.
  for (;;) {
    // List the root — returns folders (which appear as entries with id===null).
    const { data: roots, error: rootErr } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: PAGE, offset: 0 });
    if (rootErr) {
      console.error("list root failed:", rootErr.message);
      process.exit(1);
    }
    if (!roots || roots.length === 0) break;

    const allKeys: string[] = [];
    for (const entry of roots) {
      // Folder entries have id===null; file entries have a real id.
      if (entry.id) {
        allKeys.push(entry.name);
        continue;
      }
      // Folder — list its contents
      const { data: kids, error: kidsErr } = await supabase.storage
        .from(BUCKET)
        .list(entry.name, { limit: PAGE });
      if (kidsErr) {
        console.warn(`list ${entry.name} failed:`, kidsErr.message);
        continue;
      }
      for (const k of kids ?? []) {
        if (k.id) allKeys.push(`${entry.name}/${k.name}`);
      }
    }

    if (allKeys.length === 0) break;

    // Storage allows up to ~100 paths per remove() call. Chunk it.
    const CHUNK = 100;
    for (let i = 0; i < allKeys.length; i += CHUNK) {
      const slice = allKeys.slice(i, i + CHUNK);
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(slice);
      if (rmErr) {
        console.error(`remove failed:`, rmErr.message);
        process.exit(1);
      }
      totalDeleted += slice.length;
      process.stdout.write(`  deleted ${totalDeleted}…\r`);
    }
    // If we got fewer than PAGE root entries, we're done.
    if (roots.length < PAGE) break;
  }
  console.log(`\nDone. Removed ${totalDeleted} object${totalDeleted === 1 ? "" : "s"} from bucket "${BUCKET}".`);
}

main().catch((e) => { console.error(e); process.exit(1); });
