// Thin re-export — implementation lives in @prodmatch/shared so the crawler
// package can share the same retry / key-rotation runtime.
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
