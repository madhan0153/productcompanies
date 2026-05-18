// Resume → HTML renderer. Shared by the PDF generator (Playwright print)
// and by inline preview surfaces in the UI.
//
// Same data shape as the docx generator: TailoredResumeContent. Output is a
// self-contained HTML string (no external CSS / fonts / scripts) so the
// PDF generator can load it with `setContent()` and not wait on network.

import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
  /* ATS-friendly resume — single column, system fonts, no shapes. */
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Calibri", "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111827;
    max-width: 740px;
    margin: 0 auto;
    padding: 40px 36px;
    background: #ffffff;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 4px;
    text-align: center;
    letter-spacing: 0.2px;
  }
  .header-meta {
    text-align: center;
    font-size: 10pt;
    color: #4b5563;
    margin-bottom: 18px;
  }
  h2 {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1f2937;
    border-bottom: 1px solid #9ca3af;
    margin: 18px 0 8px;
    padding-bottom: 4px;
  }
  .summary { margin: 4px 0 0; }
  .skills-group { margin: 2px 0; }
  .skills-group strong { color: #111827; }
  .role { margin: 10px 0 2px; }
  .role-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 11pt;
  }
  .role-title { font-weight: 700; }
  .role-company { color: #1f2937; }
  .role-duration { color: #6b7280; font-style: italic; white-space: nowrap; font-size: 10pt; }
  ul {
    margin: 4px 0 6px;
    padding-left: 18px;
  }
  li { margin: 2px 0; }
  .edu-item, .proj-item { margin: 4px 0; }
  .edu-item strong, .proj-item strong { color: #111827; }
  .footer-note {
    margin-top: 24px;
    font-size: 8.5pt;
    color: #9ca3af;
    text-align: center;
  }
  @media print {
    body { padding: 16mm 14mm; max-width: none; }
    h2 { page-break-after: avoid; }
    .role { page-break-inside: avoid; }
  }
`;

/**
 * Render a resume content payload to a complete, self-contained HTML document.
 * The same payload powers both the docx output and this HTML/PDF rendering.
 */
export function renderResumeHtml(
  content: TailoredResumeContent,
  options: { title?: string } = {},
): string {
  const title = escape(options.title ?? `${content.header.name} — Resume`);

  const skills = (content.skills ?? []).map((g) => `
    <div class="skills-group"><strong>${escape(g.group)}:</strong> ${escape((g.items ?? []).join(", "))}</div>
  `).join("\n");

  const experience = (content.experience ?? []).map((r) => `
    <div class="role">
      <div class="role-line">
        <div>
          <span class="role-title">${escape(r.role)}</span>
          <span class="role-company">· ${escape(r.company)}</span>
        </div>
        <div class="role-duration">${escape(r.duration)}</div>
      </div>
      <ul>
        ${(r.bullets ?? []).map((b) => `<li>${escape(b)}</li>`).join("\n        ")}
      </ul>
    </div>
  `).join("\n");

  const education = (content.education ?? []).map((e) => `
    <div class="edu-item"><strong>${escape(e.degree)}</strong> — ${escape(e.institution)}${e.year ? `, ${e.year}` : ""}</div>
  `).join("\n");

  const projects = (content.projects ?? []).length > 0 ? `
    <h2>Projects</h2>
    ${(content.projects ?? []).map((p) => `
      <div class="proj-item">
        <strong>${escape(p.name)}</strong>${p.tech?.length ? ` <span style="color:#6b7280">(${escape(p.tech.join(", "))})</span>` : ""}<br/>
        ${escape(p.summary)}
      </div>
    `).join("\n")}
  ` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${CSS}</style>
</head>
<body>
  <h1>${escape(content.header.name)}</h1>
  <div class="header-meta">
    ${escape(content.header.title)}${content.header.location ? ` · ${escape(content.header.location)}` : ""}
    ${content.header.contact_line ? `<br/>${escape(content.header.contact_line)}` : ""}
  </div>

  ${content.summary ? `
  <h2>Summary</h2>
  <p class="summary">${escape(content.summary)}</p>
  ` : ""}

  ${skills ? `
  <h2>Skills</h2>
  ${skills}
  ` : ""}

  ${experience ? `
  <h2>Experience</h2>
  ${experience}
  ` : ""}

  ${education ? `
  <h2>Education</h2>
  ${education}
  ` : ""}

  ${projects}
</body>
</html>`;
}
