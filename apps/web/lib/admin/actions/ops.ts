"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv, clientEnv } from "@/lib/env";
import { requireAdmin } from "../auth";
import { recordAdminAction } from "../audit";

export interface OpsActionResult {
  ok:      boolean;
  message: string;
}

const CRON_ENDPOINTS = {
  digest:            "/api/cron/digest",
  drain_jobs:        "/api/cron/drain-background-jobs",
  recompute_matches: "/api/cron/recompute-matches",
  indexnow:          "/api/cron/indexnow",
} as const;

export type CronKey = keyof typeof CRON_ENDPOINTS;

export async function triggerCron(key: CronKey): Promise<OpsActionResult> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const path = CRON_ENDPOINTS[key];
  if (!path) return { ok: false, message: "Unknown cron endpoint." };

  const secret = serverEnv.CRON_SECRET;
  if (!secret) return { ok: false, message: "CRON_SECRET is not configured." };

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL;
  const url = new URL(path, baseUrl).toString();

  let status: number;
  let message: string;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    status = res.status;
    const txt = await res.text();
    message = txt.slice(0, 200);
  } catch (err) {
    await recordAdminAction({
      actionType: "trigger_cron", targetRef: key, status: "failed",
      metadata: { error: err instanceof Error ? err.message : "fetch failed" },
    });
    return { ok: false, message: "Network error triggering cron." };
  }

  await recordAdminAction({
    actionType: "trigger_cron",
    targetRef:  key,
    status:     status < 400 ? "success" : "failed",
    metadata:   { status, sample: message },
  });

  revalidatePath("/admin/ops");
  return {
    ok: status < 400,
    message: status < 400 ? `Cron "${key}" triggered (HTTP ${status}).` : `Cron failed: HTTP ${status} — ${message}`,
  };
}

export async function resetLlmDeadKey(deadKeyId: string): Promise<OpsActionResult> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: row } = await supabaseAdmin
    .from("llm_dead_keys")
    .select("provider_id, model")
    .eq("id", deadKeyId)
    .maybeSingle() as { data: { provider_id: string; model: string } | null };

  const { error } = await supabaseAdmin.from("llm_dead_keys").delete().eq("id", deadKeyId);
  if (error) return { ok: false, message: error.message };

  await recordAdminAction({
    actionType: "reset_dead_key",
    targetRef:  row ? `${row.provider_id}:${row.model}` : deadKeyId,
  });

  revalidatePath("/admin/ai-ops");
  revalidatePath("/admin/security");
  revalidatePath("/admin/ops");
  return { ok: true, message: "Dead key cleared." };
}

export async function clearFailedBackgroundJobs(): Promise<OpsActionResult> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("background_jobs")
    .delete()
    .eq("status", "failed")
    .select("id");

  if (error) return { ok: false, message: error.message };

  const count = data?.length ?? 0;
  await recordAdminAction({
    actionType: "clear_failed_jobs",
    metadata:   { count },
  });

  revalidatePath("/admin/security");
  revalidatePath("/admin/ops");
  return { ok: true, message: `Cleared ${count} failed background job${count === 1 ? "" : "s"}.` };
}
