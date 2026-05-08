// Thin re-export — improved Phase J implementation lives in
// @prodmatch/shared/llm/jd-parse so the crawler can call it inline at ingest.
export { parseJobDescription, ROLE_FUNCTIONS } from "@prodmatch/shared";
export type { ParsedJD, RoleFunctionJd } from "@prodmatch/shared";
