// Thin re-export — implementation lives in @prodmatch/shared so the crawler
// package can share the same retry / key-rotation runtime.
//
// Side effect: `./setup` registers the Supabase-backed DeadKeyStore with the
// shared router so dead-state persists across Vercel cold starts. Every web
// LLM call site imports through this module, so the registration runs once
// per serverless function init regardless of which entry point fired.
import "./setup";

export {
  geminiFlash,
  geminiFlashLite,
  runWithRetry,
  LlmRunError,
  SchemaType,
} from "@prodmatch/shared";
export type {
  LlmError,
  ModelTier,
  RetryOptions,
  Schema,
  GenerativeModel,
} from "@prodmatch/shared";
