// Unit tests for the PDF→text validation layer.
//
// We don't include a real PDF buffer in tests (PII concerns + repo
// hygiene). Instead we cover every rejection branch and the public-API
// shape. Live PDF parsing is exercised manually with real resume uploads
// in dev and via the e2e tests with synthetic PDFs (out of scope here).

import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPdfText,
  PdfTextExtractionError,
  PDF_MAX_OUTPUT_CHARS,
} from "../../lib/resume/pdf-text";

test("rejects empty buffer with input_empty", async () => {
  await assert.rejects(
    () => extractPdfText(new Uint8Array(0)),
    (err) => err instanceof PdfTextExtractionError && err.kind === "input_empty",
  );
});

test("rejects non-PDF magic with not_a_pdf", async () => {
  const text = new TextEncoder().encode("Just some text, definitely not a PDF.");
  await assert.rejects(
    () => extractPdfText(text),
    (err) => err instanceof PdfTextExtractionError && err.kind === "not_a_pdf",
  );
});

test("rejects fake-magic-but-corrupt with corrupt or not_a_pdf", async () => {
  // %PDF- prefix but truncated body.
  const fake = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46]);
  await assert.rejects(
    () => extractPdfText(fake),
    (err) =>
      err instanceof PdfTextExtractionError &&
      (err.kind === "corrupt" || err.kind === "not_a_pdf" || err.kind === "input_too_large"),
  );
});

test("PDF_MAX_OUTPUT_CHARS is a sane cap that fits any free provider context", () => {
  // 32k chars ≈ 8k tokens. Below every documented free-tier context window
  // (Groq 8k, Cerebras 32k, OpenRouter free 32k+, Mistral 32k, etc.).
  assert.equal(PDF_MAX_OUTPUT_CHARS, 32_000);
});

test("PdfTextExtractionError exposes a stable .kind discriminator", () => {
  const e = new PdfTextExtractionError("encrypted", "test");
  assert.equal(e.kind, "encrypted");
  assert.equal(e.name, "PdfTextExtractionError");
  // Instance check
  assert.ok(e instanceof Error);
});
