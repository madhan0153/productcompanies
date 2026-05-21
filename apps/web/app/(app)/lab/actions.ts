"use server";

// Trimmed Lab actions surface. After the Phase 1/3 lab pivot to a focused
// /dsa tab, the only Lab-era action that still ships is the Project
// Translator, which lives inside the resume editor at /profile/resume.
//
// Privacy: validates the Supabase session, rate-limits per user, and never
// logs bullet content.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/observability/log";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";
import {
  translateProjectBullet,
  type TranslatedBullet,
} from "@/lib/llm/prompts/interview-project-translate";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function translateBulletAction(input: {
  bullet: string;
  role?: string;
  company?: string;
}): Promise<ActionResult<TranslatedBullet>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const bullet = input.bullet.trim();
  if (bullet.length < 8 || bullet.length > 600) {
    return { ok: false, error: "Bullet must be 8-600 characters." };
  }
  const rate = checkRateLimit({ key: userActionKey(user.id, "translate_bullet"), limit: 60, windowMs: 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: "Too many translations this hour. Try again later." };

  const { data: profile } = await (supabase
    .from("profiles")
    .select("target_role_functions")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: { target_role_functions: string[] | null } | null;
    }>);

  let result: TranslatedBullet;
  try {
    result = await translateProjectBullet({
      bullet,
      role: input.role,
      company: input.company,
      target_role_function: profile?.target_role_functions?.[0],
    });
  } catch (err) {
    logEvent("error", "interview_project_translate_failed", { reason: errKind(err) });
    return { ok: false, error: "Translator unavailable right now." };
  }
  return { ok: true, data: result };
}

function errKind(err: unknown): string {
  if (err && typeof err === "object" && "name" in err && typeof err.name === "string") {
    if (err.name === "LlmRunError") {
      const detail = (err as { detail?: { kind?: string } }).detail;
      return detail?.kind ?? "llm_unknown";
    }
  }
  if (err instanceof Error) return err.message.slice(0, 80);
  return "unknown";
}
