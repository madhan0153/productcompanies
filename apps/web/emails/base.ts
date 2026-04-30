const BRAND_PURPLE = "#a855f7";

export function emailBase({
  previewText,
  body,
}: {
  previewText: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${previewText}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin: 0; padding: 0; background: #f4f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b; }
    .wrapper { padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: #18181b; padding: 24px 32px; }
    .logo { font-size: 20px; font-weight: 700; color: ${BRAND_PURPLE}; text-decoration: none; }
    .content { padding: 32px; }
    .footer { padding: 20px 32px; background: #f9f9fb; border-top: 1px solid #e4e4e7; }
    .footer p { margin: 0; font-size: 12px; color: #71717a; line-height: 1.6; }
    .footer a { color: ${BRAND_PURPLE}; text-decoration: none; }
    h1 { margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #18181b; }
    p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46; }
    .btn { display: inline-block; background: ${BRAND_PURPLE}; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; }
    .muted { color: #71717a; font-size: 13px; }
    hr { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <a class="logo" href="https://prodmatch.ai">ProdMatch.ai</a>
      </div>
      <div class="content">
        ${body}
      </div>
      <div class="footer">
        <p>
          ProdMatch.ai &mdash; India-first AI job matching for product engineers.<br />
          You&apos;re receiving this because you have an active ProdMatch.ai account.<br />
          <a href="https://prodmatch.ai/settings/privacy">Manage notification preferences</a>
          &nbsp;&middot;&nbsp;
          <a href="https://prodmatch.ai/settings/privacy">Privacy settings (DPDP Act 2023)</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
