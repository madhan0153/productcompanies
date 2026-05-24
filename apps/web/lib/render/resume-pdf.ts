// Resume PDF "generation" — pragmatic approach.
//
// Server-side Playwright/Chromium PDF on Vercel serverless runs into the
// 50MB function size limit AND adds cold-start latency. For an enterprise
// mobile-first app the better trade-off is:
//
//   1. Always provide the canonical PDF download (works everywhere,
//      ATS-friendly).
//   2. Provide a /resume/print HTML view that opens in a new tab with
//      `@media print` CSS already tuned for A4. The user taps "Print" in
//      the browser, picks "Save as PDF", and gets a deterministic copy.
//      On mobile this is the native iOS / Android Save-to-Files flow.
//
// This module is the helper that builds the printable HTML payload.

import { renderResumeHtml } from "./resume-html";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

/**
 * Renders a printable HTML page. The page auto-triggers the print dialog
 * 250ms after load (only when ?autoprint=1), giving the user a native
 * Save-as-PDF flow without server-side Chromium.
 */
export function renderPrintableResumeHtml(
  content: TailoredResumeContent,
  options: { autoprint?: boolean; title?: string } = {},
): string {
  const baseHtml = renderResumeHtml(content, options);

  if (!options.autoprint) return baseHtml;

  // Inject a tiny script before </body> that calls window.print()
  // once fonts have settled. The user can cancel the dialog — nothing
  // is hidden or forced.
  const printScript = `
    <script>
      (function () {
        if (typeof window === 'undefined') return;
        function go() {
          try { window.print(); } catch (e) { /* no-op */ }
        }
        if (document.readyState === 'complete') {
          setTimeout(go, 300);
        } else {
          window.addEventListener('load', function () { setTimeout(go, 300); });
        }
      })();
    </script>
  `;
  return baseHtml.replace("</body>", `${printScript}\n</body>`);
}
