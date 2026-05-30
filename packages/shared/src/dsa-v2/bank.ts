// DSA v2 — assembled question bank.
//
// Each batch file in ./questions/batch-XXX.ts exports an array of fully
// authored DsaV2Question records. This file concatenates them into the
// single in-memory bank consumed by the admin seed script and any
// non-DB callers.

import type { DsaV2Question } from "./types";
import { BATCH_001 } from "./questions/batch-001";
import { BATCH_002 } from "./questions/batch-002";
import { BATCH_003 } from "./questions/batch-003";
import { BATCH_004 } from "./questions/batch-004";
import { BATCH_005 } from "./questions/batch-005";
import { BATCH_006 } from "./questions/batch-006";
import { BATCH_007 } from "./questions/batch-007";
import { BATCH_008 } from "./questions/batch-008";
import { BATCH_009 } from "./questions/batch-009";
import { BATCH_010 } from "./questions/batch-010";
import { BATCH_011 } from "./questions/batch-011";
import { BATCH_012 } from "./questions/batch-012";
import { BATCH_013 } from "./questions/batch-013";
import { BATCH_014 } from "./questions/batch-014";

export const DSA_V2_BANK: readonly DsaV2Question[] = [
  ...BATCH_001,
  ...BATCH_002,
  ...BATCH_003,
  ...BATCH_004,
  ...BATCH_005,
  ...BATCH_006,
  ...BATCH_007,
  ...BATCH_008,
  ...BATCH_009,
  ...BATCH_010,
  ...BATCH_011,
  ...BATCH_012,
  ...BATCH_013,
  ...BATCH_014,
] as const;

export const DSA_V2_BANK_BY_SLUG: Record<string, DsaV2Question> =
  Object.fromEntries(DSA_V2_BANK.map((q) => [q.slug, q]));

export function dsaV2BankStats() {
  const total = DSA_V2_BANK.length;
  const byStatus = countBy(DSA_V2_BANK, (q) => q.status);
  const byBucket = countBy(DSA_V2_BANK, (q) => q.bucket);
  const byDifficulty = countBy(DSA_V2_BANK, (q) => q.difficulty);
  const byPattern = countBy(DSA_V2_BANK, (q) => q.pattern);
  const byRole = countBy(DSA_V2_BANK, (q) => q.primaryRole);
  return { total, byStatus, byBucket, byDifficulty, byPattern, byRole };
}

function countBy<T extends string>(items: readonly DsaV2Question[], pick: (q: DsaV2Question) => T): Record<T, number> {
  const acc = {} as Record<T, number>;
  for (const q of items) {
    const k = pick(q);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return acc;
}
