// Side-effect module: registers the Supabase-backed DeadKeyStore with the
// shared LLM router on first import. Import this once from the root layout
// (or any always-loaded server-side module) and the persistence layer is
// wired for every subsequent runOpenAiCompatibleJson / Embedding call.
//
// Safe to import multiple times — `setDeadKeyStore` is idempotent.

import { setDeadKeyStore } from "@prodmatch/shared";
import { createSupabaseDeadKeyStore } from "./dead-key-store-supabase";

setDeadKeyStore(createSupabaseDeadKeyStore());
