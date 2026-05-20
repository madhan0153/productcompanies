// Sprint 6 — Feedback re-rank.
//
// Derives per-user re-rank signal from existing action tables:
//   - matches.user_hidden = true        → strong NEGATIVE (-1.0)
//   - applications.status='saved'       → mild POSITIVE   (+0.5)
//   - applications.status='applied'+    → strong POSITIVE (+1.0)
//
// Builds a feature-association model in O(N_signals): for each labelled job
// we extract a small set of "features" (company, hubs, tech, role function,
// seniority) and accumulate sum/count per feature value. At rerank time, for
// each candidate job we sum per-feature contributions and clamp to [-18, 18]
// so the rubric (max 100) still drives ranking and feedback nudges ties.
//
// Crucially: this is per-user, computed fresh on each compute. No staleness,
// no migration risk. The output is a Map<jobId, number> the engine adds to
// the rubric total before persistence.

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_DELTA = 18;
const MIN_DELTA = -18;
const CONFIDENCE_CAP = 5; // diminishing returns past N observations per feature

// Per-feature category weight. Higher = more decisive signal.
const FEATURE_WEIGHTS = {
  company: 4.5,
  role_function: 4.0,
  seniority: 3.0,
  hub: 2.5,
  tech: 1.5,
} as const;

type FeatureCat = keyof typeof FEATURE_WEIGHTS;

interface FeatureStats {
  sum: number;    // labelled signal accumulated
  count: number;  // observation count
}

export interface FeedbackModel {
  /** Map "category:value" → { sum, count }. */
  perFeature: Map<string, FeatureStats>;
  /** Raw counts of positives + negatives for telemetry. */
  positives: number;
  negatives: number;
}

interface LabelledJob {
  job_id: string;
  label: number;
  features: Map<FeatureCat, string[]>;
}

/**
 * Pull user feedback signals and build the association model.
 * Returns an empty model when the user has no history yet (cold start).
 */
export async function buildFeedbackModel(
  admin: SupabaseClient,
  userId: string,
): Promise<FeedbackModel> {
  const model: FeedbackModel = {
    perFeature: new Map(),
    positives: 0,
    negatives: 0,
  };

  // (1) Dismissals — negative signal.

  const { data: dismissed } = await (admin
    .from("matches")
    .select("job_id")
    .eq("user_id", userId)
    .eq("user_hidden", true) as any) as { data: Array<{ job_id: string }> | null };

  // (2) Saved / applied — positive signals at different strengths.

  const { data: actions } = await (admin
    .from("applications")
    .select("job_id, status")
    .eq("user_id", userId) as any) as { data: Array<{ job_id: string; status: string }> | null };

  const labelByJob = new Map<string, number>();
  for (const r of dismissed ?? []) labelByJob.set(r.job_id, -1.0);
  for (const r of actions ?? []) {
    // saved is the weakest signal; applied+ are strong. Don't let a saved row
    // OVERWRITE a stronger dismissal (which would be weird, but be safe).
    const strength = r.status === "saved" ? 0.5 : 1.0;
    const existing = labelByJob.get(r.job_id);
    if (existing === undefined || strength > Math.abs(existing)) {
      labelByJob.set(r.job_id, strength);
    }
  }

  if (labelByJob.size === 0) return model;

  // (3) Fetch features for those jobs in one round-trip.
  const jobIds = [...labelByJob.keys()];
  const featuresByJob = new Map<string, LabelledJob["features"]>();
  // Page so we don't blow PostgREST's IN-list limit on heavy users.
  const PAGE = 200;
  for (let i = 0; i < jobIds.length; i += PAGE) {
    const slice = jobIds.slice(i, i + PAGE);

    const { data: rows } = await (admin
      .from("jobs")
      .select("id, company_id, role_function, seniority, hubs, must_have_skills")
      .in("id", slice) as any) as { data: Array<{
        id: string;
        company_id: string | null;
        role_function: string | null;
        seniority: string | null;
        hubs: string[] | null;
        must_have_skills: string[] | null;
      }> | null };
    for (const r of rows ?? []) {
      const features = new Map<FeatureCat, string[]>();
      if (r.company_id)    features.set("company",       [r.company_id]);
      if (r.role_function) features.set("role_function", [r.role_function]);
      if (r.seniority)     features.set("seniority",     [r.seniority]);
      features.set("hub",  (r.hubs ?? []).filter(Boolean));
      features.set("tech", (r.must_have_skills ?? []).filter(Boolean).slice(0, 8));
      featuresByJob.set(r.id, features);
    }
  }

  // (4) Accumulate into the per-feature model.
  for (const [jobId, label] of labelByJob.entries()) {
    const feats = featuresByJob.get(jobId);
    if (!feats) continue;
    if (label > 0) model.positives++;
    else model.negatives++;
    for (const [cat, values] of feats.entries()) {
      for (const value of values) {
        const key = featureKey(cat, value);
        const cur = model.perFeature.get(key) ?? { sum: 0, count: 0 };
        cur.sum += label;
        cur.count += 1;
        model.perFeature.set(key, cur);
      }
    }
  }

  return model;
}

/**
 * Compute the feedback delta for a single candidate job given the model.
 * Returns 0 for cold-start users so first-time scoring is unaffected.
 */
export function feedbackDelta(
  model: FeedbackModel,
  job: {
    company_id?: string | null;
    role_function: string | null;
    seniority: string | null;
    hubs: string[];
    must_have_skills: string[];
  },
): number {
  if (model.perFeature.size === 0) return 0;

  const features: Array<[FeatureCat, string]> = [];
  if (job.company_id)     features.push(["company",       job.company_id]);
  if (job.role_function)  features.push(["role_function", job.role_function]);
  if (job.seniority)      features.push(["seniority",     job.seniority]);
  for (const h of job.hubs)             features.push(["hub",  h]);
  for (const t of (job.must_have_skills ?? []).slice(0, 8)) features.push(["tech", t]);

  let delta = 0;
  for (const [cat, value] of features) {
    const stat = model.perFeature.get(featureKey(cat, value));
    if (!stat || stat.count === 0) continue;
    // Confidence saturates after CONFIDENCE_CAP observations — protects
    // against one weird outlier dictating future ranking.
    const avg = stat.sum / stat.count;
    const conf = Math.min(stat.count, CONFIDENCE_CAP) / CONFIDENCE_CAP;
    delta += avg * conf * FEATURE_WEIGHTS[cat];
  }

  if (delta > MAX_DELTA) return MAX_DELTA;
  if (delta < MIN_DELTA) return MIN_DELTA;
  // Round to one decimal for clean persistence.
  return Math.round(delta * 10) / 10;
}

function featureKey(cat: FeatureCat, value: string): string {
  return `${cat}:${value.toLowerCase()}`;
}
