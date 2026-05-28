// DSA v2 — hand-authored question bank, no templates.
//
// Every question is reviewed manually before it can be dispatched. The
// `status` lifecycle is the source of truth for what's allowed to reach
// a user. See packages/shared/src/dsa-v2/bank.ts for the assembled bank
// and packages/shared/src/dsa-v2/questions/batch-001.ts for authored
// content.

export type DsaV2Status =
  | "pending_review"
  | "live"
  | "rejected"
  | "deferred"
  | "archived";

export type DsaV2Difficulty = "easy" | "medium" | "hard";

export type DsaV2Bucket =
  | "pure_dsa"        // ~85% — classical DSA with fresh original framings.
  | "ai_applied"      // ~10% — tasteful enhancement; DSA inside an AI scene.
  | "indian_domain";  // ~5%  — UPI / Indian product context, classical DSA.

export type DsaV2Pattern =
  | "arrays_hashing"
  | "two_pointers"
  | "sliding_window"
  | "stack_queue"
  | "binary_search"
  | "linked_list"
  | "trees"
  | "tries"
  | "heap_priority_queue"
  | "backtracking"
  | "graphs"
  | "dp_1d"
  | "dp_2d"
  | "greedy"
  | "intervals"
  | "math_geometry"
  | "bit_manipulation";

export type DsaV2Role =
  | "software_engineer"
  | "backend_engineer"
  | "frontend_engineer"
  | "full_stack_engineer"
  | "ai_ml_engineer"
  | "data_engineer"
  | "devops_sre"
  | "mobile_engineer"
  | "security_engineer"
  | "platform_engineer";

export interface DsaV2Example {
  input: string;
  output: string;
  explanation: string;
}

export interface DsaV2Question {
  /** Stable identifier — persisted in interview_daily_dispatch.problem_slug. */
  slug: string;
  /** Bumped when an authored question is revised after going live. */
  version: number;
  status: DsaV2Status;
  bucket: DsaV2Bucket;
  /** Author batch number — review tooling groups by this. */
  batchNo: number;
  pattern: DsaV2Pattern;
  difficulty: DsaV2Difficulty;
  primaryRole: DsaV2Role;
  /** All roles this question is appropriate for. Always includes primaryRole. */
  roles: DsaV2Role[];
  title: string;
  /** 2-3 line product-flavored scene setter shown before the formal statement. */
  framing: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: DsaV2Example[];
  /** Progressive reveal stage 2 — narrative approach the learner can read. */
  approach: string[];
  /** Progressive reveal stage 3 — step-by-step solution discussion. */
  solutionSteps: string[];
  code: { python: string; java: string; cpp: string };
  complexity: { time: string; space: string };
  pitfalls: string[];
  edgeCases: string[];
  whyItMatters: string;
  estimatedMinutes: number;
}

export interface DsaV2PatternRoadmapItem {
  pattern: DsaV2Pattern;
  label: string;
  order: number;
  focus: string;
}

export interface DsaV2RoleTrack {
  role: DsaV2Role;
  label: string;
  description: string;
  concepts: string[];
}
