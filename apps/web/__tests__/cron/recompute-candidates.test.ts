import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  remainingAfterProcessed,
  selectEligibleRecomputeCandidates,
  type RecomputeProfileScanRow,
} from "../../lib/cron/recompute-candidates";

const baseProfile = (input: Partial<RecomputeProfileScanRow> & { id: string }): RecomputeProfileScanRow => ({
  id: input.id,
  resume_storage_path: input.resume_storage_path ?? "resumes/user.pdf",
  resume_embedding_at: input.resume_embedding_at ?? "2026-06-01T00:00:00.000Z",
  resume_parsed_version_id: input.resume_parsed_version_id ?? "version-a",
  resume_embedding_version_id: input.resume_embedding_version_id ?? "version-a",
  active_resume_version_id: input.active_resume_version_id ?? "version-a",
  pending_resume_version_id: input.pending_resume_version_id ?? null,
  resume_parse_error: input.resume_parse_error ?? null,
  last_match_compute_at: input.last_match_compute_at ?? null,
});

describe("daily recompute candidate selection", () => {
  it("does not let older ineligible profiles hide later eligible users", () => {
    const profiles = [
      baseProfile({ id: "old-no-consent", last_match_compute_at: null }),
      baseProfile({
        id: "old-version-mismatch",
        last_match_compute_at: "2026-05-20T00:00:00.000Z",
        resume_parsed_version_id: "version-old",
      }),
      baseProfile({
        id: "eligible-newer",
        last_match_compute_at: "2026-06-01T00:00:00.000Z",
      }),
    ];

    const result = selectEligibleRecomputeCandidates(
      profiles,
      new Set(["old-version-mismatch", "eligible-newer"]),
      60,
      null,
    );

    assert.equal(result.totalEligible, 1);
    assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["eligible-newer"]);
  });

  it("orders eligible users stale-first and respects the batch size", () => {
    const result = selectEligibleRecomputeCandidates(
      [
        baseProfile({ id: "fresh", last_match_compute_at: "2026-06-02T00:00:00.000Z" }),
        baseProfile({ id: "never", last_match_compute_at: null }),
        baseProfile({ id: "stale", last_match_compute_at: "2026-05-01T00:00:00.000Z" }),
      ],
      new Set(["fresh", "never", "stale"]),
      2,
      null,
    );

    assert.equal(result.totalEligible, 3);
    assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["never", "stale"]);
  });

  it("counts retry successes as processed work", () => {
    assert.equal(remainingAfterProcessed(3, 0), 3);
    assert.equal(remainingAfterProcessed(3, 1), 2);
    assert.equal(remainingAfterProcessed(3, 3), 0);
    assert.equal(remainingAfterProcessed(3, 4), 0);
  });
});
