import { emailBase } from "./base";

export function erasureConfirmedHtml({ name }: { name: string }) {
  const body = `
    <h1>Your account has been deleted</h1>
    <p>Hi ${name || "there"}, this email confirms that your ProdMatch.ai account and all associated personal data have been permanently deleted as requested.</p>
    <p><strong>What was deleted:</strong></p>
    <ul style="padding-left:20px;margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.8;">
      <li>Your profile and resume</li>
      <li>All job match scores and explanations</li>
      <li>Applications, interview notes, and offer comparisons</li>
      <li>STAR story bank entries</li>
      <li>Consent records and digest subscription</li>
    </ul>
    <p>This action is permanent and cannot be undone. The consent audit log is retained in anonymised form for legal compliance as required under the <strong>DPDP Act 2023</strong>.</p>
    <hr />
    <p class="muted">
      If you did not request this deletion, please contact us immediately at
      <a href="mailto:privacy@prodmatch.ai" style="color:#a855f7;text-decoration:none;">privacy@prodmatch.ai</a>.
    </p>
  `;
  return emailBase({ previewText: "Your ProdMatch.ai account and data have been permanently deleted", body });
}
