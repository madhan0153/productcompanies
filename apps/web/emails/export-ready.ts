import { emailBase } from "./base";

export function exportReadyHtml({
  name,
  downloadUrl,
}: {
  name: string;
  downloadUrl: string;
}) {
  const body = `
    <h1>Your data export is ready</h1>
    <p>Hi ${name || "there"}, as requested under the <strong>DPDP Act 2023</strong>, your personal data export has been prepared.</p>
    <p>The export includes your profile, match scores, applications, stories, offers, and consent audit log in JSON format.</p>
    <p style="text-align:center;margin:28px 0;">
      <a class="btn" href="${downloadUrl}">Download your data</a>
    </p>
    <p class="muted">This link requires you to be signed in to ProdMatch.ai and is valid for your current session only. If the link doesn&apos;t work, please visit <a href="${downloadUrl}" style="color:#a855f7;text-decoration:none;">prodmatch.ai/api/export</a> while signed in.</p>
    <hr />
    <p class="muted">
      Under the Digital Personal Data Protection Act 2023 (India), you have the right to access, correct, and erase your personal data.
      Manage all data permissions in your <a href="https://prodmatch.ai/settings/privacy" style="color:#a855f7;text-decoration:none;">Privacy settings</a>.
    </p>
  `;
  return emailBase({ previewText: "Your ProdMatch.ai data export is ready to download", body });
}
