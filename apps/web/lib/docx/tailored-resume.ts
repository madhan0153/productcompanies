// Sprint 5 — Feature 34a. Tailored-resume → .docx generator.
//
// Pure function: takes the structured TailoredResumeContent from Gemini
// and returns a Buffer the server action uploads to Supabase Storage.
// Uses the `docx` package which is Node-friendly and has no native deps.
//
// Style choices:
//   - Single-column ATS-friendly layout (no tables, no text boxes — ATS
//     systems frequently fail to parse those).
//   - Calibri 11pt body / 22pt name / 12pt section heads. Default Word
//     fonts so the file looks normal everywhere.
//   - Clear section dividers via underlined heading paragraphs (not
//     horizontal-rule shapes — also ATS-fragile).

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle,
} from "docx";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

const FONT = "Calibri";

function head(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "999999", space: 2, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 24, font: FONT, color: "1F2937" }),
    ],
  });
}

function body(text: string, opts: { bold?: boolean; italic?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italic }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [
      new TextRun({ text, font: FONT, size: 22 }),
    ],
  });
}

function nameLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text, bold: true, font: FONT, size: 44, color: "111827" }),
    ],
  });
}

function subtitleLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text, font: FONT, size: 22, color: "374151" }),
    ],
  });
}

function contactLine(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text, font: FONT, size: 20, color: "4B5563" }),
    ],
  });
}

export async function renderTailoredResumeDocx(content: TailoredResumeContent): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  sections.push(nameLine(content.header.name));
  sections.push(subtitleLine([content.header.title, content.header.location].filter(Boolean).join("  ·  ")));
  if (content.header.contact_line) {
    sections.push(contactLine(content.header.contact_line));
  }

  // ── Summary ────────────────────────────────────────────────────────────
  if (content.summary) {
    sections.push(head("Summary"));
    sections.push(body(content.summary));
  }

  // ── Skills ─────────────────────────────────────────────────────────────
  if (content.skills.length > 0) {
    sections.push(head("Skills"));
    for (const group of content.skills) {
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${group.group}: `, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: group.items.join(", "), font: FONT, size: 22 }),
          ],
        }),
      );
    }
  }

  // ── Experience ─────────────────────────────────────────────────────────
  if (content.experience.length > 0) {
    sections.push(head("Experience"));
    for (const role of content.experience) {
      sections.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: role.role, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: "  ·  ", font: FONT, size: 22, color: "9CA3AF" }),
            new TextRun({ text: role.company, font: FONT, size: 22, color: "374151" }),
          ],
        }),
      );
      if (role.duration) {
        sections.push(body(role.duration, { italic: true, size: 20 }));
      }
      for (const b of role.bullets) {
        sections.push(bullet(b));
      }
    }
  }

  // ── Projects (optional) ────────────────────────────────────────────────
  if (content.projects && content.projects.length > 0) {
    sections.push(head("Selected projects"));
    for (const p of content.projects) {
      sections.push(
        new Paragraph({
          spacing: { before: 100, after: 20 },
          children: [
            new TextRun({ text: p.name, bold: true, font: FONT, size: 22 }),
            ...(p.tech.length > 0
              ? [
                  new TextRun({ text: "  —  ", font: FONT, size: 22, color: "9CA3AF" }),
                  new TextRun({ text: p.tech.join(", "), font: FONT, size: 20, italics: true, color: "4B5563" }),
                ]
              : []),
          ],
        }),
      );
      if (p.summary) sections.push(body(p.summary));
    }
  }

  // ── Education ──────────────────────────────────────────────────────────
  if (content.education.length > 0) {
    sections.push(head("Education"));
    for (const e of content.education) {
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: e.degree, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: "  ·  ", font: FONT, size: 22, color: "9CA3AF" }),
            new TextRun({ text: e.institution, font: FONT, size: 22, color: "374151" }),
            ...(e.year ? [new TextRun({ text: `  ·  ${e.year}`, font: FONT, size: 22, color: "6B7280" })] : []),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    creator: "ProdMatch.ai",
    title: `${content.header.name} — tailored resume`,
    description: "JD-targeted resume generated by ProdMatch.ai",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5" all round
          },
        },
        children: sections,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
