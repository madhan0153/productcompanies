import PDFDocument from "pdfkit";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

const PAGE = {
  size: "A4" as const,
  margin: 42,
  bottom: 42,
};

export async function renderTailoredResumePdf(content: TailoredResumeContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: PAGE.size,
      margins: { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.bottom, left: PAGE.margin },
      info: {
        Title: `${content.header.name} - tailored resume`,
        Author: content.header.name,
        Creator: "ProdMatch.ai",
        Producer: "ProdMatch.ai",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    render(doc, content);
    doc.end();
  });
}

function render(doc: PDFKit.PDFDocument, content: TailoredResumeContent) {
  const width = doc.page.width - PAGE.margin * 2;
  const bottomY = () => doc.page.height - PAGE.bottom;

  const ensureSpace = (height: number) => {
    if (doc.y + height > bottomY()) doc.addPage();
  };

  const text = (value: string, options: PDFKit.Mixins.TextOptions = {}) => {
    doc.text(clean(value), { width, ...options });
  };

  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20);
  text(content.header.name, { align: "center" });
  doc.moveDown(0.18);

  const meta = [
    content.header.title,
    content.header.location,
    content.header.contact_line,
  ].filter(Boolean).join(" | ");
  doc.fillColor("#374151").font("Helvetica").fontSize(9.5);
  text(meta, { align: "center" });
  doc.moveDown(0.55);

  if (content.summary) {
    section(doc, "Summary", ensureSpace, width);
    doc.fillColor("#111827").font("Helvetica").fontSize(9.6);
    text(content.summary, { lineGap: 1.2 });
  }

  if (content.skills.length > 0) {
    section(doc, "Skills", ensureSpace, width);
    for (const group of content.skills) {
      ensureSpace(18);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.4).text(`${clean(group.group)}: `, {
        continued: true,
        width,
      });
      doc.font("Helvetica").text(clean(group.items.join(", ")), { width });
    }
  }

  if (content.experience.length > 0) {
    section(doc, "Experience", ensureSpace, width);
    for (const role of content.experience) {
      ensureSpace(58);
      doc.moveDown(0.22);
      const startY = doc.y;
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.8).text(clean(role.role), PAGE.margin, startY, {
        width: width * 0.6,
        continued: false,
      });
      doc.fillColor("#374151").font("Helvetica").fontSize(9.2).text(clean(role.company), PAGE.margin, doc.y, {
        width: width * 0.6,
      });
      if (role.duration) {
        doc.fillColor("#6B7280").font("Helvetica-Oblique").fontSize(8.8).text(clean(role.duration), PAGE.margin, startY, {
          width,
          align: "right",
        });
      }
      doc.moveDown(0.18);
      for (const bullet of role.bullets.slice(0, 5)) {
        bulletLine(doc, clean(bullet), ensureSpace, width);
      }
    }
  }

  if (content.projects && content.projects.length > 0) {
    section(doc, "Selected Projects", ensureSpace, width);
    for (const project of content.projects) {
      ensureSpace(42);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5).text(clean(project.name), { width });
      if (project.tech.length > 0) {
        doc.fillColor("#4B5563").font("Helvetica-Oblique").fontSize(8.8).text(clean(project.tech.join(", ")), { width });
      }
      doc.fillColor("#111827").font("Helvetica").fontSize(9.2).text(clean(project.summary), { width, lineGap: 1 });
      doc.moveDown(0.2);
    }
  }

  if (content.education.length > 0) {
    section(doc, "Education", ensureSpace, width);
    for (const education of content.education) {
      ensureSpace(20);
      const suffix = education.year ? `, ${education.year}` : "";
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.4).text(clean(education.degree), {
        continued: true,
        width,
      });
      doc.font("Helvetica").text(clean(` - ${education.institution}${suffix}`), { width });
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
  doc.fillColor("#1F2937").font("Helvetica-Bold").fontSize(10.2).text(label.toUpperCase(), { width });
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
  const x = PAGE.margin + 8;
  const y = doc.y;
  doc.fillColor("#111827").font("Helvetica").fontSize(9.3).text("-", PAGE.margin, y, { width: 8 });
  doc.text(value, x, y, { width: width - 8, lineGap: 1 });
  doc.moveDown(0.12);
}

function clean(value: string) {
  return value
    .replace(/[•●◦]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
