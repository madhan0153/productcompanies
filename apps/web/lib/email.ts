import { Resend } from "resend";
import { serverEnv } from "./env";
import { weeklyDigestHtml, type DigestMatch } from "@/emails/weekly-digest";
import { exportReadyHtml } from "@/emails/export-ready";
import { erasureConfirmedHtml } from "@/emails/erasure-confirmed";
import { clientEnv } from "./env";

// Resend client is optional — missing key means emails are silently skipped (dev mode).
const resend = serverEnv.RESEND_API_KEY
  ? new Resend(serverEnv.RESEND_API_KEY)
  : null;

const FROM =
  serverEnv.RESEND_FROM_EMAIL ?? "ProdMatch.ai <noreply@prodmatch.ai>";

const APP_URL = clientEnv.NEXT_PUBLIC_APP_URL;

export async function sendWeeklyDigest({
  to,
  name,
  matches,
  unsubscribeUrl,
}: {
  to: string;
  name: string;
  matches: DigestMatch[];
  unsubscribeUrl: string;
}) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${matches.length} new match${matches.length !== 1 ? "es" : ""} this week — ProdMatch.ai`,
    html: weeklyDigestHtml({ name, matches, unsubscribeUrl, appUrl: APP_URL }),
  });
}

export async function sendExportReady({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  if (!resend) return;
  const downloadUrl = `${APP_URL}/api/export`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your data export is ready — ProdMatch.ai",
    html: exportReadyHtml({ name, downloadUrl }),
  });
}

export async function sendErasureConfirmed({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your account has been deleted — ProdMatch.ai",
    html: erasureConfirmedHtml({ name }),
  });
}
