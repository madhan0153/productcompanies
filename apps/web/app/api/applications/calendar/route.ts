import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRoute, unauthorized } from "@/lib/http/api";

export const dynamic = "force-dynamic";

// Path: /api/applications/calendar — returns an iCalendar (.ics) file with one
// VEVENT per application that has a `next_action_at` set. Lets users subscribe
// in Google / Apple Calendar so follow-ups don't slip.

type AppRow = {
  id: string;
  status: string;
  next_action_at: string;
  notes: string | null;
  jobs: { title: string | null; apply_url: string | null; companies: { name: string | null } | null } | null;
};

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Returns null for an unparseable timestamp so a single bad row can't poison
// the whole feed with `NaNNaNNaN…` (which most calendar clients reject).
function fmtUtc(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"
  );
}

export const GET = safeRoute("applications.calendar", async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized("Please sign in to export your follow-ups.");

  const { data: rawApps } = await supabase
    .from("applications")
    .select("id, status, next_action_at, notes, jobs(title, apply_url, companies(name))")
    .eq("user_id", user.id)
    .not("next_action_at", "is", null);

  const apps = (rawApps as unknown as AppRow[] | null) ?? [];
  const now = fmtUtc(new Date().toISOString()) ?? "19700101T000000Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProdMatch.ai//Applications//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:ProdMatch.ai Follow-ups`,
  ];

  for (const a of apps) {
    if (!a.next_action_at) continue;
    const start = fmtUtc(a.next_action_at);
    // Skip rows with an unparseable timestamp rather than emitting a broken
    // VEVENT that would invalidate the whole calendar in strict clients.
    if (!start) continue;
    // Default 30-minute slot
    const endDate = new Date(a.next_action_at);
    endDate.setMinutes(endDate.getMinutes() + 30);
    const end = fmtUtc(endDate.toISOString()) ?? start;
    const company = a.jobs?.companies?.name ?? "Application";
    const title = a.jobs?.title ?? "Follow up";
    const summary = `Follow up: ${title} — ${company}`;
    const descParts = [
      `Status: ${a.status}`,
      a.notes ? `Notes: ${a.notes}` : null,
      a.jobs?.apply_url ? `Job: ${a.jobs.apply_url}` : null,
    ].filter(Boolean) as string[];

    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@prodmatch.ai`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(descParts.join("\n"))}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="prodmatch-followups.ics"`,
      "Cache-Control": "no-store",
    },
  });
});
