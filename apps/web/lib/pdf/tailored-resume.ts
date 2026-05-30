import PDFDocument from "pdfkit";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";
import { normalizeTailoredResumeContent } from "../render/tailored-resume-content";

const PAGE = {
  size: "A4" as const,
  margin: 42,
  bottom: 42,
};

export async function renderTailoredResumePdf(content: TailoredResumeContent): Promise<Buffer> {
  const normalized = normalizeTailoredResumeContent(content);
  const titleName = clean(normalized.header.name || "Candidate");
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: PAGE.size,
      margins: { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.bottom, left: PAGE.margin },
      info: {
        Title: `${titleName} - tailored resume`,
        Author: titleName,
        Creator: "ProdMatch.ai",
        Producer: "ProdMatch.ai",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    render(doc, normalized);
    doc.end();
  });
}

function render(doc: PDFKit.PDFDocument, content: TailoredResumeContent) {
  const width = doc.page.width - PAGE.margin * 2;
  const bottomY = () => doc.page.height - PAGE.bottom;

  const ensureSpace = (height: number) => {
    if (doc.y + height > bottomY()) doc.addPage();
  };

  const text = (value: unknown, options: PDFKit.Mixins.TextOptions = {}) => {
    doc.text(clean(value), { width, ...options });
  };

  // Name
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20);
  text(content.header?.name || "Candidate", { align: "center" });
  doc.moveDown(0.18);

  // Title + location on one line
  const titleMeta = [content.header?.title, content.header?.location].filter(Boolean).join(" | ");
  doc.fillColor("#374151").font("Helvetica").fontSize(10.5);
  text(titleMeta, { align: "center" });

  // Contact line — split by separator and render each part with clickable link
  const contactLine = (content.header?.contact_line ?? "").trim();
  if (contactLine) {
    const parts = contactLine.split(/\s+·\s+/).map((p) => p.trim()).filter(Boolean);
    const separator = "  ·  ";
    doc.fillColor("#374151").font("Helvetica").fontSize(10);
    // Centre manually: render as a single line using continued:true segments
    const fullLine = parts.join(separator);
    const lineWidth = doc.widthOfString(fullLine);
    const startX = PAGE.margin + (width - lineWidth) / 2;
    const y = doc.y;
    let curX = startX;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const link = resolveLink(part);
      const color = link ? "#1D4ED8" : "#374151";
      doc.fillColor(color).font("Helvetica").fontSize(10);
      const opts: PDFKit.Mixins.TextOptions = { continued: i < parts.length - 1, width, lineBreak: false };
      if (link) (opts as Record<string, unknown>).link = link;
      doc.text(part, curX, y, opts);
      curX += doc.widthOfString(part);
      if (i < parts.length - 1) {
        doc.fillColor("#9CA3AF").font("Helvetica").fontSize(10);
        doc.text(separator, curX, y, { continued: true, width, lineBreak: false });
        curX += doc.widthOfString(separator);
      }
    }
    doc.text("", { lineBreak: true }); // flush
  }
  doc.moveDown(0.55);

  if (content.summary) {
    section(doc, "Summary", ensureSpace, width);
    doc.fillColor("#111827").font("Helvetica").fontSize(10.5);
    text(content.summary, { lineGap: 1.2 });
  }

  if ((content.skills ?? []).length > 0) {
    section(doc, "Skills", ensureSpace, width);
    for (const group of content.skills ?? []) {
      ensureSpace(18);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(`${clean(group.group)}: `, {
        continued: true,
        width,
      });
      doc.font("Helvetica").text(clean((group.items ?? []).join(", ")), { width });
    }
  }

  if ((content.experience ?? []).length > 0) {
    section(doc, "Experience", ensureSpace, width);
    for (const role of content.experience ?? []) {
      ensureSpace(58);
      doc.moveDown(0.22);
      const startY = doc.y;
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text(clean(role.role), PAGE.margin, startY, {
        width: width * 0.6,
        continued: false,
      });
      doc.fillColor("#374151").font("Helvetica").fontSize(10).text(clean(role.company), PAGE.margin, doc.y, {
        width: width * 0.6,
      });
      if (role.duration) {
        doc.fillColor("#6B7280").font("Helvetica-Oblique").fontSize(10).text(clean(role.duration), PAGE.margin, startY, {
          width,
          align: "right",
        });
      }
      doc.moveDown(0.18);
      for (const bullet of (role.bullets ?? []).slice(0, 5)) {
        bulletLine(doc, clean(bullet), ensureSpace, width);
      }
    }
  }

  if ((content.projects ?? []).length > 0) {
    section(doc, "Selected Projects", ensureSpace, width);
    for (const project of content.projects ?? []) {
      ensureSpace(42);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(clean(project.name), { width });
      if ((project.tech ?? []).length > 0) {
        doc.fillColor("#4B5563").font("Helvetica-Oblique").fontSize(10).text(clean((project.tech ?? []).join(", ")), { width });
      }
      doc.fillColor("#111827").font("Helvetica").fontSize(10).text(clean(project.summary), { width, lineGap: 1 });
      doc.moveDown(0.2);
    }
  }

  if ((content.education ?? []).length > 0) {
    section(doc, "Education", ensureSpace, width);
    for (const education of content.education ?? []) {
      ensureSpace(20);
      const suffix = education.year ? `, ${education.year}` : "";
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(clean(education.degree), {
        continued: true,
        width,
      });
      doc.font("Helvetica").text(clean(` - ${education.institution}${suffix}`), { width });
    }
  }

  if ((content.certifications ?? []).length > 0) {
    section(doc, "Certifications", ensureSpace, width);
    for (const cert of content.certifications ?? []) {
      ensureSpace(18);
      const parts = [clean(cert.name)];
      if (cert.issuer) parts.push(clean(cert.issuer));
      if (cert.year) parts.push(String(cert.year));
      doc.fillColor("#111827").font("Helvetica").fontSize(10.5).text(parts.join(" — "), { width });
    }
  }
}

function section(
  doc: PDFKit.PDFDocument,
  label: string,
  ensureSpace: (height: number) => void,
  width: number,
) {
  ensureSpace(34);
  doc.moveDown(0.72);
  doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(11).text(label.toUpperCase(), { width });
  const y = doc.y + 1;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + width, y).strokeColor("#9CA3AF").lineWidth(0.5).stroke();
  doc.moveDown(0.42);
}

function bulletLine(
  doc: PDFKit.PDFDocument,
  value: string,
  ensureSpace: (height: number) => void,
  width: number,
) {
  ensureSpace(28);
  const x = PAGE.margin + 10;
  const y = doc.y;
  doc.fillColor("#374151").font("Helvetica").fontSize(10.5).text("•", PAGE.margin, y, { width: 10 });
  doc.fillColor("#111827").font("Helvetica").fontSize(10.5).text(value, x, y, { width: width - 10, lineGap: 1 });
  doc.moveDown(0.12);
}

/** Resolve a clickable link href for a contact line segment, or null if plain text. */
function resolveLink(part: string): string | null {
  const p = part.trim();
  if (/@/.test(p)) return `mailto:${p}`;
  if (/linkedin\.com/i.test(p)) return p.startsWith("http") ? p : `https://${p}`;
  if (/github\.com/i.test(p)) return p.startsWith("http") ? p : `https://${p}`;
  return null;
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[●◦]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
