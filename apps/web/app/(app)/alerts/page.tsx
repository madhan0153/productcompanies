import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, BellOff, Clock, Mail } from "lucide-react";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Alerts" };

async function setDigestFrequency(formData: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const frequency = formData.get("frequency") as "weekly" | "off";

  const nextSendAt = frequency === "weekly"
    ? (() => {
        const d = new Date();
        // next Monday 08:00 IST
        const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + daysUntilMonday);
        d.setHours(8, 0, 0, 0);
        return d.toISOString();
      })()
    : null;

  await supabase.from("digest_subscriptions").upsert(
    { user_id: user.id, frequency, next_send_at: nextSendAt },
    { onConflict: "user_id" },
  );

  revalidatePath("/alerts");
}

export default async function AlertsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: sub } = await supabase
    .from("digest_subscriptions")
    .select("frequency, last_sent_at, next_send_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentFrequency = sub?.frequency ?? "off";
  const isOn = currentFrequency === "weekly";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how ProdMatch.ai notifies you about new matches.
        </p>
      </div>

      {/* Weekly digest card */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOn ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h2 className="font-medium">Weekly match digest</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Receive a curated list of your top new matches every Monday morning at 08:00 IST.
            </p>

            {sub?.last_sent_at && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last sent: {formatDate(sub.last_sent_at)}
              </p>
            )}
            {isOn && sub?.next_send_at && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Next digest: {formatDate(sub.next_send_at)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <form action={setDigestFrequency}>
            <input type="hidden" name="frequency" value="weekly" />
            <button
              type="submit"
              disabled={isOn}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                isOn
                  ? "bg-primary text-primary-foreground shadow shadow-primary/20 cursor-default"
                  : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {isOn ? "✓ Weekly digest on" : "Turn on weekly digest"}
            </button>
          </form>

          {isOn && (
            <form action={setDigestFrequency}>
              <input type="hidden" name="frequency" value="off" />
              <button
                type="submit"
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-400"
              >
                Turn off
              </button>
            </form>
          )}
        </div>
      </div>

      {/* DPDP notice */}
      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DPDP Act 2023 · </span>
          Email digest requires your <span className="font-medium">digest_email</span> consent to be active.
          {" "}You can manage all data permissions in{" "}
          <a href="/settings/privacy" className="text-primary underline-offset-2 hover:underline">
            Privacy settings
          </a>.
        </p>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
    });
  } catch { return ""; }
}
