// Resume Intelligence — telemetry write helper.
//
// Records structural facts about each pipeline step into
// `public.resume_intel_events`. The table NEVER stores resume bullet text
// or PII — only counts, severities, and timing. This is what powers the
// quota counter, the admin cost dashboard, and DPDP-export audits.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ResumeIntelKind =
  | "diagnosis"
  | "rewrite_batch"
  | "render_docx"
  | "render_pdf"
  | "finalise"
  | "discard";

export type ResumeIntelScope = "enhanced" | "tailored";

export interface RecordEventInput {
  user_id: string;
  kind: ResumeIntelKind;
  scope: ResumeIntelScope;
  scope_ref_id?: string | null;
  llm_tier?: "heavy" | "light" | null;
  cost_tokens_in?: number | null;
  cost_tokens_out?: number | null;
  latency_ms?: number | null;
  ok: boolean;
  error_kind?: string | null;
}

export async function recordResumeIntelEvent(input: RecordEventInput): Promise<void> {
  const admin = createSupabaseAdminClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("resume_intel_events") as any).insert({
      user_id:         input.user_id,
      kind:            input.kind,
      scope:           input.scope,
      scope_ref_id:    input.scope_ref_id ?? null,
      llm_tier:        input.llm_tier ?? null,
      cost_tokens_in:  input.cost_tokens_in ?? null,
      cost_tokens_out: input.cost_tokens_out ?? null,
      latency_ms:      input.latency_ms ?? null,
      ok:              input.ok,
      error_kind:      input.error_kind ?? null,
    });
  } catch {
    // Telemetry must never block the user — swallow errors silently.
  }
}
