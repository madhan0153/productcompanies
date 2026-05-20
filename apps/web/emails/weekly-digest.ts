import { emailBase } from "./base";

export type DigestMatch = {
  title: string;
  company: string;
  score: number;
  location: string | null;
  reasoning: string | null;
  applyUrl: string | null;
};

function scoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 55) return "#f59e0b";
  return "#71717a";
}

function matchCard(m: DigestMatch): string {
  const sc = scoreColor(m.score);
  return `
  <div style="margin-bottom:16px;padding:16px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 2px;font-size:12px;color:#71717a;">${m.company}</p>
          <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#18181b;">${m.title}</p>
          ${m.location ? `<p style="margin:0 0 8px;font-size:12px;color:#71717a;">📍 ${m.location}</p>` : ""}
          ${m.reasoning ? `<p style="margin:0 0 10px;font-size:13px;color:#52525b;line-height:1.5;">${m.reasoning}</p>` : ""}
        </td>
        <td width="56" valign="top" style="text-align:right;">
          <div style="display:inline-block;background:${sc}1a;color:${sc};border:1px solid ${sc}33;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${m.score}%</div>
        </td>
      </tr>
    </table>
    ${m.applyUrl ? `<a href="${m.applyUrl}" style="display:inline-block;margin-top:4px;font-size:12px;color:#a855f7;text-decoration:none;font-weight:500;">Apply →</a>` : ""}
  </div>`;
}

export function weeklyDigestHtml({
  name,
  matches,
  unsubscribeUrl,
  appUrl,
}: {
  name: string;
  matches: DigestMatch[];
  unsubscribeUrl: string;
  appUrl: string;
}) {
  const body = `
    <h1>Your weekly match digest</h1>
    <p>Hi ${name || "there"}, here are your top ${matches.length} new match${matches.length !== 1 ? "es" : ""} this week.</p>
    ${matches.map((m) => matchCard(m)).join("")}
    <hr />
    <p style="text-align:center;">
      <a class="btn" href="${appUrl}/matches">View all matches →</a>
    </p>
    <p class="muted" style="text-align:center;margin-top:16px;">
      Don&apos;t want weekly emails?
      <a href="${unsubscribeUrl}" style="color:#a855f7;text-decoration:none;">Unsubscribe</a>
    </p>
  `;
  return emailBase({ previewText: `Your ${matches.length} new role matches this week`, body });
}
