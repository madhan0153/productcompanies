// Server-side PDF → text extraction for the resume fallback path.
//
// WHY THIS EXISTS:
//   The primary resume parse path is multimodal Gemini (it can read tables,
//   columns, and headers in the PDF directly). When Gemini is exhausted, no
//   other configured provider supports PDF input (Groq, OpenRouter, etc. are
//   text-only). Without a text fallback the resume features go offline for
//   the entire duration of Gemini's daily quota window.
//
//   This module extracts plain text on the server using `unpdf` (a serverless-
//   friendly wrapper around pdfjs-dist). The extracted text is then passed
//   to any text-capable LLM through the normal provider router.
//
// PRIVACY:
//   Resume text contains PII. This module:
//     - Never logs the extracted text.
//     - Only logs metadata (input bytes, output chars, time taken).
//     - Throws specific, non-leaky errors for the validation paths.
//
// LIMITS:
//   - Defers input-size limits to the existing `validateResumePdf` (5 MB / 12 pages).
//   - Caps output at 32 000 chars. A 32k-char prompt fits in every free
//     provider's context window; longer text adds noise without signal.

import { extractText, getDocumentProxy } from "unpdf";
// Use a relative import here so the module loads cleanly when the test
// runner (tsx + node:test) imports it directly without going through the
// Next.js bundler's path-alias resolution.
import { validateResumePdf } from "../security/pdf";

export const PDF_MAX_OUTPUT_CHARS = 32_000;

export class PdfTextExtractionError extends Error {
  constructor(public readonly kind: PdfTextErrorKind, message: string) {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

export type PdfTextErrorKind =
  | "input_empty"           // zero-byte buffer
  | "input_too_large"       // exceeds PDF_MAX_INPUT_BYTES
  | "not_a_pdf"             // missing %PDF magic prefix
  | "encrypted"             // PDF is password-protected
  | "corrupt"               // PDF parse threw
  | "no_text"               // PDF parsed but had no extractable text (scanned image-only)
  ;

/**
 * Extract concatenated text from a PDF buffer.
 *
 * @param input Buffer | Uint8Array | ArrayBuffer with PDF bytes
 * @returns Trimmed, length-capped plain-text representation
 * @throws PdfTextExtractionError on every well-defined failure mode
 */
export async function extractPdfText(input: Buffer | Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = toUint8Array(input);

  if (bytes.byteLength === 0) {
    throw new PdfTextExtractionError("input_empty", "PDF buffer is empty");
  }
  if (!hasPdfMagic(bytes)) {
    throw new PdfTextExtractionError("not_a_pdf", "File does not start with %PDF header");
  }

  // Reuse the existing security validator: same magic check + suspicious-
  // token block + encryption check that the multimodal path enforces. We
  // pass the bytes as a fresh ArrayBuffer slice to satisfy that function's
  // ArrayBuffer-typed parameter without confusing it with Uint8Array views.
  // Copy the bytes into a fresh ArrayBuffer (validateResumePdf expects
  // ArrayBuffer specifically; a Uint8Array view's `.buffer` may be
  // SharedArrayBuffer which TS rejects).
  const arr = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arr).set(bytes);
  const validation = validateResumePdf(arr, "application/pdf");
  if (!validation.ok) {
    throw new PdfTextExtractionError(
      validation.code === "encrypted_pdf" ? "encrypted" :
      validation.code === "too_large" || validation.code === "too_small" ? "input_too_large" :
      validation.code === "fake_pdf" || validation.code === "mime_type" ? "not_a_pdf" :
      "corrupt",
      `Resume PDF rejected by validator: ${validation.code}`,
    );
  }

  let proxy;
  try {
    proxy = await getDocumentProxy(bytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(msg)) {
      throw new PdfTextExtractionError("encrypted", "Resume PDF is password-protected");
    }
    throw new PdfTextExtractionError("corrupt", "Resume PDF could not be parsed");
  }

  let raw;
  try {
    raw = await extractText(proxy, { mergePages: true });
  } catch {
    throw new PdfTextExtractionError("corrupt", "Resume PDF text extraction failed");
  }

  const text = Array.isArray(raw.text) ? raw.text.join("\n") : (raw.text ?? "");
  const normalised = normalise(text);
  if (normalised.length < 80) {
    // 80 chars is below what any real resume produces; a scanned image-only
    // PDF returns nothing useful at this layer (an OCR step would be needed).
    throw new PdfTextExtractionError(
      "no_text",
      "No extractable text in the PDF (likely a scanned image without OCR)",
    );
  }
  return normalised.length > PDF_MAX_OUTPUT_CHARS
    ? normalised.slice(0, PDF_MAX_OUTPUT_CHARS)
    : normalised;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toUint8Array(input: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  // Buffer is a Uint8Array subclass; fall through.
  return new Uint8Array(input);
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  // %PDF-
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function normalise(text: string): string {
  // Collapse runs of whitespace, normalise unicode quirks pdfjs leaves
  // behind (form-feed, NBSP), and trim. Keep newlines so the LLM has
  // structure cues for sections / bullets.
  return text
    .replace(/ /g, " ")
    .replace(/\f/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
