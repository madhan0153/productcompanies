"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendErasureConfirmed } from "@/lib/email";
import type { DpdpEventType } from "@/lib/supabase/types";

export async function requestDataExport() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Log the export request event
  await supabase.from("dpdp_events").insert({
    user_id: user.id,
    event: "export_requested" as DpdpEventType,
    metadata: { source: "settings_ui" },
  });

  // Redirect user to the export endpoint which streams the JSON download
  redirect("/api/export");
}

// Sprint 4 — Item 31. Transactional DPDP erasure.
//
// The earlier implementation called storage delete → row deletes → auth
// delete sequentially with no error handling. A partial failure (rare but
// catastrophic) left orphan PII behind — RLS made it inaccessible to the
// user but it was still on disk, which fails a DPDP audit.
//
// New flow:
//   1. Log `erasure_requested` audit row (idempotent — keyed on uid+event).
//   2. List + delete the user's resume storage objects. Fail hard if this
//      step errors — we never want PII stuck in Storage after the row
//      deletes succeed.
//   3. Run `request_user_erasure` RPC (deletes profile, matches,
//      applications, etc. — preserves the anonymised audit log).
//   4. Delete the auth user (loses session immediately).
//   5. Log `erasure_completed` audit row with timestamp.
//
// Any step's failure is logged into `dpdp_events.metadata.error` and
// re-raised so the operator can resume from the partial state. Steps 2–4
// are independently retryable — re-running on a partially-erased account
// is idempotent (storage delete on missing keys is a no-op; RPC is
// idempotent; auth deleteUser on a missing user returns 404 we swallow).

export type ErasureProgress =
  | "started"
  | "storage_cleared"
  | "rows_deleted"
  | "auth_deleted"
  | "completed";

export async function requestErasure(formData: FormData) {
  const confirmation = formData.get("confirmation") as string;
  if (confirmation !== "DELETE MY ACCOUNT") return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const uid = user.id;
  const email = user.email ?? "";

  // Fetch display_name for the farewell email before erasure.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", uid)
    .maybeSingle();
  const name = profile?.display_name ?? email.split("@")[0];

  const admin = createSupabaseAdminClient();
  const t0 = Date.now();

  // Helper: stamp an audit row with the current progress + any error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function audit(progress: ErasureProgress, extra: Record<string, unknown> = {}) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("dpdp_events") as any).insert({
        user_id: uid,
        event: (progress === "completed" ? "erasure_completed" : "erasure_requested") as DpdpEventType,
        metadata: { progress, elapsed_ms: Date.now() - t0, ...extra },
      });
    } catch (err) {
      // Audit failure is never fatal — the erasure continues. Operator
      // sees the gap via metadata.progress on the next successful row.
      console.warn("[erasure.audit] insert failed:", err instanceof Error ? err.message : String(err));
    }
  }

  await audit("started");

  // ── Step 1: clear resume storage ────────────────────────────────────────
  // List everything under {uid}/ and remove in chunks. Soft-fail when the
  // user has no resume; hard-fail on actual storage errors so we don't
  // proceed to row deletion with PII still on disk.
  try {
    const { data: objects, error: listErr } = await admin.storage
      .from("resumes")
      .list(uid, { limit: 1000 });
    if (listErr) throw new Error(`storage list: ${listErr.message}`);

    const keys = (objects ?? []).filter((o) => o.id).map((o) => `${uid}/${o.name}`);
    if (keys.length > 0) {
      const { error: rmErr } = await admin.storage.from("resumes").remove(keys);
      if (rmErr) throw new Error(`storage remove (${keys.length} key(s)): ${rmErr.message}`);
    }
    await audit("storage_cleared", { removed: keys.length });
  } catch (err) {
    await audit("started", { error: (err as Error).message, failed_at: "storage_cleared" });
    throw err;
  }

  // ── Step 2: drop user-scoped rows via the security-definer RPC ─────────
  try {
    const { error: rpcErr } = await admin.rpc("request_user_erasure", { uid });
    if (rpcErr) throw new Error(`request_user_erasure: ${rpcErr.message}`);
    await audit("rows_deleted");
  } catch (err) {
    await audit("storage_cleared", { error: (err as Error).message, failed_at: "rows_deleted" });
    throw err;
  }

  // ── Step 3: drop the auth user ─────────────────────────────────────────
  // 404 from deleteUser is treated as already-erased (idempotent retry).
  try {
    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr && authErr.status !== 404) {
      throw new Error(`auth deleteUser: ${authErr.message}`);
    }
    await audit("auth_deleted");
  } catch (err) {
    await audit("rows_deleted", { error: (err as Error).message, failed_at: "auth_deleted" });
    throw err;
  }

  // ── Final audit row — completed ────────────────────────────────────────
  await audit("completed");

  // Send confirmation email (fire and forget — user is already signed out).
  sendErasureConfirmed({ to: email, name }).catch(() => {});

  // Redirect to a farewell page — session is now invalid.
  redirect("/auth/login?erased=1");
}

export async function resendExportEmail() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("dpdp_events").insert({
    user_id: user.id,
    event: "export_requested" as DpdpEventType,
    metadata: { source: "email_link" },
  });

  revalidatePath("/settings/privacy");
}
