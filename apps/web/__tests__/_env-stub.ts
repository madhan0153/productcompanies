// Side-effect-only module loaded before any code that touches `serverEnv`
// or `clientEnv` — supplies stub values so the Zod schema in lib/env.ts
// doesn't throw inside the test process. Keep this file pure: only env writes.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub_anon_key";
}
