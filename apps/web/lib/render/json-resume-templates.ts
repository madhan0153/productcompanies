// Multi-template HTML renderer for JSON Resume documents.
//
// Reactive-Resume-inspired multi-template surface, reimplemented from
// scratch in TypeScript against the open JSON Resume v1.0.0 spec. No code
// is borrowed from Reactive Resume. See /NOTICE.md.
//
// Two templates ship in the initial pass:
//
//   "ats"     Single-column, system fonts, no shapes — ATS-friendly. The
//             closest match to the existing tailored-resume render.
//
//   "modern"  Two-column with a thin left rail (contact + skills) and a
//             wider right column (summary + experience + education). Looks
//             great on screen and prints well at A4.
//
// Privacy: the renderer is a pure function. No logging, no I/O. Returns a
// self-contained HTML string with inline CSS so the print route doesn't
// touch the network (avoids font flicker on first print).

import type { JsonResume } from "@prodmatch/shared";

export type ResumeTemplate = "ats" | "modern";

export const ALL_TEMPLATES: ResumeTemplate[] = ["ats", "modern"];

/** Public API: pick a template and get a complete HTML document. */
export function renderJsonResumeHtml(
  resume: JsonResume,
  template: ResumeTemplate,
  options: { autoprint?: boolean } = {},
): string {
  const body = template === "modern" ? renderModern(resume) : renderAts(resume);
  const css = template === "modern" ? MODERN_CSS : ATS_CSS;
  const title = `Resume — ${resume.basics.name || "Untitled"}`;
  return wrap(title, css, body, options.autoprint === true);
}

// ── Common helpers ────────────────────────────────────────────────────────

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  const s = formatDate(start);
  const e = end ? formatDate(end) : "Present";
  return s ? `${s} – ${e}` : e;
}

function formatDate(s?: string): string {
  if (!s) return "";
  if (/^present$/i.test(s)) return "Present";
  const m = s.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return esc(s);
  const year = m[1];
  if (!m[2]) return year;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = parseInt(m[2], 10) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${year}` : year;
}

function contactLine(resume: JsonResume): string {
  const parts: string[] = [];
  if (resume.basics.email) parts.push(esc(resume.basics.email));
  if (resume.basics.phone) parts.push(esc(resume.basics.phone));
  if (resume.basics.url) parts.push(esc(resume.basics.url));
  for (const p of resume.basics.profiles) {
    if (p.url) parts.push(`${esc(p.network)}: ${esc(p.url)}`);
    else if (p.username) parts.push(`${esc(p.network)}: ${esc(p.username)}`);
  }
  return parts.join(" · ");
}

function locationLine(resume: JsonResume): string {
  const loc = resume.basics.location;
  if (!loc) return "";
  const bits = [loc.city, loc.region, loc.countryCode].filter(Boolean);
  return bits.join(", ");
}

// ── ATS template ──────────────────────────────────────────────────────────

const ATS_CSS = `
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
  h1 { font-size: 22pt; font-weight: 700; margin: 0 0 4px; text-align: center; letter-spacing: 0.2px; }
  .meta { text-align: center; font-size: 10pt; color: #4b5563; margin-bottom: 6px; }
  .loc { text-align: center; font-size: 10pt; color: #4b5563; margin-bottom: 18px; }
  h2 { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
       border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 18px 0 8px; }
  .role-row { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; }
  .role-row .left { font-weight: 600; }
  .role-row .right { color: #4b5563; font-size: 10pt; white-space: nowrap; }
  ul { margin: 4px 0 0 18px; padding: 0; }
  li { margin: 2px 0; }
  .summary { white-space: pre-wrap; }
  .skill-row { margin: 4px 0; }
  .skill-row .group { font-weight: 600; }
  @media print {
    body { padding: 24px 24px; max-width: 100%; }
    h2 { page-break-after: avoid; }
    .role-row, li { page-break-inside: avoid; }
  }
`;

function renderAts(r: JsonResume): string {
  const out: string[] = [];
  const name = esc(r.basics.name) || "Resume";
  const label = esc(r.basics.label || "");
  const contact = contactLine(r);
  const loc = esc(locationLine(r));

  out.push(`<h1>${name}</h1>`);
  if (label) out.push(`<div class="meta">${label}</div>`);
  if (contact) out.push(`<div class="meta">${contact}</div>`);
  if (loc) out.push(`<div class="loc">${loc}</div>`);

  if (r.basics.summary) {
    out.push(`<h2>Summary</h2><p class="summary">${esc(r.basics.summary)}</p>`);
  }

  if (r.skills.length > 0) {
    out.push(`<h2>Skills</h2>`);
    for (const s of r.skills) {
      out.push(`<div class="skill-row"><span class="group">${esc(s.name)}:</span> ${esc(s.keywords.join(", "))}</div>`);
    }
  }

  if (r.work.length > 0) {
    out.push(`<h2>Experience</h2>`);
    for (const w of r.work) {
      out.push(`<div class="role-row"><div class="left">${esc(w.position)} · ${esc(w.name)}</div><div class="right">${esc(dateRange(w.startDate, w.endDate))}</div></div>`);
      if (w.summary) out.push(`<p>${esc(w.summary)}</p>`);
      if (w.highlights.length > 0) {
        out.push(`<ul>${w.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
      }
    }
  }

  if (r.projects.length > 0) {
    out.push(`<h2>Projects</h2>`);
    for (const p of r.projects) {
      out.push(`<div class="role-row"><div class="left">${esc(p.name)}</div><div class="right">${esc(dateRange(p.startDate, p.endDate))}</div></div>`);
      if (p.description) out.push(`<p>${esc(p.description)}</p>`);
      if (p.highlights.length > 0) {
        out.push(`<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
      }
      if (p.keywords.length > 0) {
        out.push(`<p style="color:#4b5563;font-size:10pt;">Tech: ${esc(p.keywords.join(", "))}</p>`);
      }
    }
  }

  if (r.education.length > 0) {
    out.push(`<h2>Education</h2>`);
    for (const e of r.education) {
      const degree = [e.studyType, e.area].filter(Boolean).join(", ");
      out.push(`<div class="role-row"><div class="left">${esc(degree || "Degree")} · ${esc(e.institution)}</div><div class="right">${esc(dateRange(e.startDate, e.endDate))}</div></div>`);
    }
  }

  if (r.certificates.length > 0) {
    out.push(`<h2>Certifications</h2><ul>`);
    for (const c of r.certificates) {
      const tail = [c.issuer, formatDate(c.date)].filter(Boolean).join(" · ");
      out.push(`<li>${esc(c.name)}${tail ? ` <span style="color:#4b5563;">(${esc(tail)})</span>` : ""}</li>`);
    }
    out.push(`</ul>`);
  }

  if (r.awards.length > 0) {
    out.push(`<h2>Awards</h2><ul>`);
    for (const a of r.awards) {
      const tail = [a.awarder, formatDate(a.date)].filter(Boolean).join(" · ");
      out.push(`<li>${esc(a.title)}${tail ? ` <span style="color:#4b5563;">(${esc(tail)})</span>` : ""}${a.summary ? ` — ${esc(a.summary)}` : ""}</li>`);
    }
    out.push(`</ul>`);
  }

  if (r.languages.length > 0) {
    out.push(`<h2>Languages</h2>`);
    out.push(r.languages.map((l) => `${esc(l.language)}${l.fluency ? ` (${esc(l.fluency)})` : ""}`).join(" · "));
  }

  return out.join("\n");
}

// ── Modern template ──────────────────────────────────────────────────────

const MODERN_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #1f2937;
    background: #ffffff;
    margin: 0 auto;
    padding: 0;
    max-width: 820px;
  }
  .layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 28px;
    padding: 36px 36px;
  }
  .rail { background: #f8fafc; border-radius: 8px; padding: 18px; }
  .rail h3 { font-size: 9pt; font-weight: 700; text-transform: uppercase;
             letter-spacing: 0.8px; color: #475569; margin: 16px 0 6px; }
  .rail h3:first-child { margin-top: 0; }
  .rail .item { font-size: 10pt; margin: 2px 0; word-break: break-word; }
  .main h1 { font-size: 24pt; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
  .main .label { font-size: 12pt; color: #64748b; margin-bottom: 14px; }
  .main h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase;
             letter-spacing: 0.6px; color: #0f172a; margin: 20px 0 8px;
             border-bottom: 2px solid #0f172a; padding-bottom: 3px; }
  .role-row { display: flex; justify-content: space-between; gap: 10px; margin-top: 10px; }
  .role-row .left { font-weight: 600; color: #0f172a; }
  .role-row .right { color: #64748b; font-size: 9.5pt; white-space: nowrap; }
  ul { margin: 4px 0 0 16px; padding: 0; }
  li { margin: 2px 0; }
  .keywords { color: #64748b; font-size: 9.5pt; margin-top: 4px; }
  @media print {
    body { max-width: 100%; }
    .layout { padding: 20px; gap: 20px; }
    .role-row, li { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
  }
  @media (max-width: 640px) {
    .layout { grid-template-columns: 1fr; gap: 18px; padding: 20px; }
  }
`;

function renderModern(r: JsonResume): string {
  const out: string[] = [];
  const name = esc(r.basics.name) || "Resume";
  const label = esc(r.basics.label || "");
  const loc = esc(locationLine(r));

  // Rail
  const railParts: string[] = [];
  railParts.push(`<h3>Contact</h3>`);
  if (r.basics.email) railParts.push(`<div class="item">${esc(r.basics.email)}</div>`);
  if (r.basics.phone) railParts.push(`<div class="item">${esc(r.basics.phone)}</div>`);
  if (r.basics.url) railParts.push(`<div class="item">${esc(r.basics.url)}</div>`);
  if (loc) railParts.push(`<div class="item">${loc}</div>`);
  for (const p of r.basics.profiles) {
    railParts.push(`<div class="item">${esc(p.network)}: ${esc(p.url ?? p.username ?? "")}</div>`);
  }

  if (r.skills.length > 0) {
    railParts.push(`<h3>Skills</h3>`);
    for (const s of r.skills) {
      railParts.push(`<div class="item"><strong>${esc(s.name)}</strong>: ${esc(s.keywords.join(", "))}</div>`);
    }
  }

  if (r.languages.length > 0) {
    railParts.push(`<h3>Languages</h3>`);
    for (const l of r.languages) {
      railParts.push(`<div class="item">${esc(l.language)}${l.fluency ? ` — ${esc(l.fluency)}` : ""}</div>`);
    }
  }

  if (r.certificates.length > 0) {
    railParts.push(`<h3>Certifications</h3>`);
    for (const c of r.certificates) {
      railParts.push(`<div class="item">${esc(c.name)}${c.issuer ? ` — ${esc(c.issuer)}` : ""}</div>`);
    }
  }

  // Main column
  const mainParts: string[] = [];
  mainParts.push(`<h1>${name}</h1>`);
  if (label) mainParts.push(`<div class="label">${label}</div>`);

  if (r.basics.summary) {
    mainParts.push(`<h2>Summary</h2><p>${esc(r.basics.summary)}</p>`);
  }

  if (r.work.length > 0) {
    mainParts.push(`<h2>Experience</h2>`);
    for (const w of r.work) {
      mainParts.push(`<div class="role-row"><div class="left">${esc(w.position)} · ${esc(w.name)}</div><div class="right">${esc(dateRange(w.startDate, w.endDate))}</div></div>`);
      if (w.summary) mainParts.push(`<p>${esc(w.summary)}</p>`);
      if (w.highlights.length > 0) {
        mainParts.push(`<ul>${w.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
      }
    }
  }

  if (r.projects.length > 0) {
    mainParts.push(`<h2>Projects</h2>`);
    for (const p of r.projects) {
      mainParts.push(`<div class="role-row"><div class="left">${esc(p.name)}</div><div class="right">${esc(dateRange(p.startDate, p.endDate))}</div></div>`);
      if (p.description) mainParts.push(`<p>${esc(p.description)}</p>`);
      if (p.highlights.length > 0) {
        mainParts.push(`<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
      }
      if (p.keywords.length > 0) {
        mainParts.push(`<p class="keywords">${esc(p.keywords.join(" · "))}</p>`);
      }
    }
  }

  if (r.education.length > 0) {
    mainParts.push(`<h2>Education</h2>`);
    for (const e of r.education) {
      const degree = [e.studyType, e.area].filter(Boolean).join(", ");
      mainParts.push(`<div class="role-row"><div class="left">${esc(degree || "Degree")} · ${esc(e.institution)}</div><div class="right">${esc(dateRange(e.startDate, e.endDate))}</div></div>`);
    }
  }

  if (r.awards.length > 0) {
    mainParts.push(`<h2>Awards</h2><ul>`);
    for (const a of r.awards) {
      mainParts.push(`<li><strong>${esc(a.title)}</strong>${a.awarder ? ` — ${esc(a.awarder)}` : ""}${a.summary ? ` — ${esc(a.summary)}` : ""}</li>`);
    }
    mainParts.push(`</ul>`);
  }

  out.push(`<div class="layout">`);
  out.push(`  <aside class="rail">${railParts.join("\n")}</aside>`);
  out.push(`  <section class="main">${mainParts.join("\n")}</section>`);
  out.push(`</div>`);
  return out.join("\n");
}

// ── HTML wrapper ──────────────────────────────────────────────────────────

function wrap(title: string, css: string, body: string, autoprint: boolean): string {
  const printScript = autoprint
    ? `<script>
         (function () {
           if (typeof window === 'undefined') return;
           function go() { try { window.print(); } catch (e) {} }
           if (document.readyState === 'complete') setTimeout(go, 250);
           else window.addEventListener('load', () => setTimeout(go, 250));
         })();
       </script>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${esc(title)}</title>
    <style>${css}</style>
  </head>
  <body>
    ${body}
    ${printScript}
  </body>
</html>`;
}
