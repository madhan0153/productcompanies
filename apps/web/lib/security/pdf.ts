export type PdfValidationResult =
  | { ok: true; pageCount: number }
  | { ok: false; code: string; message: string };

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MIN_RESUME_BYTES = 4 * 1024;
const MAX_RESUME_PAGES = 12;
const PDF_SIGNATURE = "%PDF-";

// PDF tokens that indicate ACTUAL active content worth rejecting.
// The original list was too broad and produced false positives for every
// modern resume — Word, Google Docs, LaTeX, Overleaf, Resume.io, Canva,
// and almost every ATS-friendly resume exporter routinely emit
// /OpenAction (go-to-first-page on open), /AA (additional actions for
// print/save lifecycle), and /EmbeddedFile (font subsets and PDF/A
// attachments). None of those represent a real attack surface in a PDF
// that the user is going to upload, parse, and never re-open as a
// document. We keep the genuinely-active triggers:
//
//   /JavaScript, /JS    → embedded scripts (actual code execution)
//   /Launch             → external file/process launch
//   /RichMedia          → Flash / video / 3D embeds
//
// Patterns are regexes anchored at PDF-token boundaries (the byte after
// the keyword must be whitespace, /, (, <, or end-of-stream). Without
// the boundary, "/JS" alone would false-match the middle of unrelated
// compressed stream bytes that happen to contain those three chars.
const SUSPICIOUS_TOKEN_RES: RegExp[] = [
  /\/JavaScript(?=[\s/<(\r\n])/,
  /\/JS(?=[\s/<(\r\n])/,
  /\/Launch(?=[\s/<(\r\n])/,
  /\/RichMedia(?=[\s/<(\r\n])/,
];

function bytesToAscii(bytes: ArrayBuffer, maxBytes = 1024 * 1024): string {
  return Buffer.from(bytes.slice(0, Math.min(bytes.byteLength, maxBytes))).toString("latin1");
}

export function validateResumePdf(bytes: ArrayBuffer, mimeType: string | null): PdfValidationResult {
  if (mimeType !== "application/pdf") {
    return { ok: false, code: "mime_type", message: "Please upload a PDF file." };
  }
  if (bytes.byteLength > MAX_RESUME_BYTES) {
    return { ok: false, code: "too_large", message: "File too large. Upload a PDF under 5 MB." };
  }
  if (bytes.byteLength < MIN_RESUME_BYTES) {
    return { ok: false, code: "too_small", message: "This PDF is too small to be a real resume. Re-export and try again." };
  }

  const head = bytesToAscii(bytes, 32);
  if (!head.startsWith(PDF_SIGNATURE)) {
    return { ok: false, code: "fake_pdf", message: "This file does not look like a valid PDF. Re-export it and try again." };
  }

  const body = bytesToAscii(bytes);
  const tail = Buffer.from(bytes.slice(Math.max(0, bytes.byteLength - 2048))).toString("latin1");
  if (!/%%EOF/.test(tail)) {
    return { ok: false, code: "malformed_pdf", message: "This PDF appears incomplete or malformed. Re-export it and try again." };
  }
  if (/\/Encrypt\b/.test(body)) {
    return { ok: false, code: "encrypted_pdf", message: "Encrypted or password-protected PDFs are not supported. Upload an unlocked resume PDF." };
  }
  if (SUSPICIOUS_TOKEN_RES.some((re) => re.test(body))) {
    return { ok: false, code: "unsafe_pdf", message: "This PDF contains executable scripts or active content (JavaScript / Launch action / RichMedia). Re-export it without these and try again." };
  }

  const pageCount = Math.max(1, (body.match(/\/Type\s*\/Page\b/g) ?? []).length);
  if (pageCount > MAX_RESUME_PAGES) {
    return { ok: false, code: "too_many_pages", message: "Resume PDFs must be 12 pages or fewer. Upload a shorter resume." };
  }

  const textLikeChars = body.replace(/[^\x20-\x7E]+/g, "").length;
  if (textLikeChars < 80) {
    return { ok: false, code: "no_text_signal", message: "This PDF may not contain readable text. Export a text-based PDF and try again." };
  }

  return { ok: true, pageCount };
}

/**
 * QA fix (B5): the regex-based page count above is fast but can be defeated
 * by a crafted PDF that hides `/Type /Page` inside compressed object streams.
 * `verifyPdfPageCount` is the authoritative async check used after the cheap
 * sync validator passes. We keep `validateResumePdf` synchronous (it's still
 * cheap and rejects 99% of bad PDFs early); the async check below is the
 * adversarial-grade backstop.
 *
 * Returns the decoded page count, or `null` if the PDF library could not
 * read the document at all (in which case the caller should reject — a PDF
 * that no library can open is not a valid resume).
 */
export async function verifyPdfPageCount(bytes: ArrayBuffer): Promise<number | null> {
  try {
    const { getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(bytes);
    const doc = await getDocumentProxy(buf);
    return doc.numPages;
  } catch {
    return null;
  }
}
