// Tailored-resume -> .docx generator.
//
// Pure function: takes structured TailoredResumeContent and returns a Buffer
// the server action uploads to Supabase Storage. The layout is intentionally
// ATS-friendly: one column, no tables, no text boxes.

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

const FONT = "Calibri";

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2022\u25cf\u25e6]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function head(text: unknown): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "999999", space: 2, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({ text: clean(text).toUpperCase(), bold: true, size: 24, font: FONT, color: "1F2937" }),
    ],
  });
}

function body(text: unknown, opts: { bold?: boolean; italic?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: clean(text), font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italic }),
    ],
  });
}

function bullet(text: unknown): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [
      new TextRun({ text: clean(text), font: FONT, size: 22 }),
    ],
  });
}

function nameLine(text: unknown): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: clean(text), bold: true, font: FONT, size: 44, color: "111827" }),
    ],
  });
}

function subtitleLine(text: unknown): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: clean(text), font: FONT, size: 22, color: "374151" }),
    ],
  });
}

function contactLine(text: unknown): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: clean(text), font: FONT, size: 20, color: "4B5563" }),
    ],
  });
}

export async function renderTailoredResumeDocx(content: TailoredResumeContent): Promise<Buffer> {
  const sections: Paragraph[] = [];
  const header = content.header ?? {
    name: "Candidate",
    title: "",
    location: "",
    contact_line: "",
  };

  sections.push(nameLine(header.name || "Candidate"));
  sections.push(subtitleLine([header.title, header.location].filter(Boolean).join(" - ")));
  if (header.contact_line) {
    sections.push(contactLine(header.contact_line));
  }

  if (content.summary) {
    sections.push(head("Summary"));
    sections.push(body(content.summary));
  }

  if ((content.skills ?? []).length > 0) {
    sections.push(head("Skills"));
    for (const group of content.skills ?? []) {
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${clean(group.group)}: `, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: clean((group.items ?? []).join(", ")), font: FONT, size: 22 }),
          ],
        }),
      );
    }
  }

  if ((content.experience ?? []).length > 0) {
    sections.push(head("Experience"));
    for (const role of content.experience ?? []) {
      sections.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: clean(role.role), bold: true, font: FONT, size: 22 }),
            new TextRun({ text: " - ", font: FONT, size: 22, color: "9CA3AF" }),
            new TextRun({ text: clean(role.company), font: FONT, size: 22, color: "374151" }),
          ],
        }),
      );
      if (role.duration) {
        sections.push(body(role.duration, { italic: true, size: 20 }));
      }
      for (const b of role.bullets ?? []) {
        sections.push(bullet(b));
      }
    }
  }

  if ((content.projects ?? []).length > 0) {
    sections.push(head("Selected projects"));
    for (const p of content.projects ?? []) {
      sections.push(
        new Paragraph({
          spacing: { before: 100, after: 20 },
          children: [
            new TextRun({ text: clean(p.name), bold: true, font: FONT, size: 22 }),
            ...((p.tech ?? []).length > 0
              ? [
                  new TextRun({ text: " - ", font: FONT, size: 22, color: "9CA3AF" }),
                  new TextRun({ text: clean((p.tech ?? []).join(", ")), font: FONT, size: 20, italics: true, color: "4B5563" }),
                ]
              : []),
          ],
        }),
      );
      if (p.summary) sections.push(body(p.summary));
    }
  }

  if ((content.education ?? []).length > 0) {
    sections.push(head("Education"));
    for (const e of content.education ?? []) {
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: clean(e.degree), bold: true, font: FONT, size: 22 }),
            new TextRun({ text: " - ", font: FONT, size: 22, color: "9CA3AF" }),
            new TextRun({ text: clean(e.institution), font: FONT, size: 22, color: "374151" }),
            ...(e.year ? [new TextRun({ text: ` - ${e.year}`, font: FONT, size: 22, color: "6B7280" })] : []),
          ],
        }),
      );
    }
  }

  if ((content.certifications ?? []).length > 0) {
    sections.push(head("Certifications"));
    for (const c of content.certifications ?? []) {
      const parts: string[] = [clean(c.name)];
      if (c.issuer) parts.push(clean(c.issuer));
      if (c.year) parts.push(String(c.year));
      sections.push(body(parts.join(" — ")));
    }
  }

  const doc = new Document({
    creator: "ProdMatch.ai",
    title: `${clean(header.name || "Candidate")} - tailored resume`,
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
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: sections,
      },
    ],
  });

  return Packer.toBuffer(doc);
}