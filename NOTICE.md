# NOTICE

ProdMatch.ai includes adaptive crawler primitives (element fingerprinting and
fallback selector resolution) whose design is inspired by the Scrapling project.

## Scrapling

- Project: Scrapling
- Repository: https://github.com/D4Vinci/Scrapling
- License: MIT
- Author/maintainer: D4Vinci and contributors

We do not vendor any Scrapling source code. Scrapling is written in Python; the
adaptive-selector and element-fingerprint *ideas* (CSS-first lookup with a
structural-similarity fallback, persisted reference signatures, parser-state
checkpoints) have been re-implemented in TypeScript inside
`packages/crawler/lib/{fingerprint.ts,adaptive.ts,fixture-store.ts}` to fit the
official-source-only ProdMatch crawling model.

The following Scrapling capabilities are intentionally **not** adopted:

- Stealth fetchers, browser-fingerprint evasion, anti-bot bypass.
- Proxy rotation or any technique that obscures the crawler's identity.
- Any behavior that would conflict with official career-page Terms of Service.

ProdMatch crawls only the 18 approved companies' official career pages, with a
single, identifiable User-Agent.

## Reactive Resume

- Project: Reactive Resume
- Repository: https://github.com/AmruthPillai/Reactive-Resume
- Author/maintainer: Amruth Pillai and contributors

ProdMatch does **not** vendor any Reactive Resume source code. Reactive
Resume's published license has at times been copyleft (AGPL-style); to
avoid any license contamination risk for a private SaaS, the Reactive-
Resume-inspired features in ProdMatch (the structured JSON Resume editor,
multi-template HTML preview, JSON import/export endpoints) were
reimplemented from scratch in TypeScript against the **open JSON Resume
v1.0.0 specification** at https://jsonresume.org/schema/ (MIT-licensed,
maintained independently of Reactive Resume).

We thank the Reactive Resume project for popularising structured,
JSON-backed resume editing as a category. No copyleft obligations attach
to ProdMatch because no Reactive Resume code was copied.

The relevant ProdMatch files:

- `packages/shared/src/schemas/resume-json.ts` — zod schema mirroring
  jsonresume.org/schema/.
- `apps/web/lib/resume/json-mapper.ts` — bidirectional mapper to the
  internal ParsedResume shape.
- `apps/web/lib/render/json-resume-templates.ts` — multi-template HTML
  renderer.
- `apps/web/app/(app)/profile/resume/` — mobile-first editor + print route.
- `apps/web/app/api/resume/{import,export}/route.ts` — interop endpoints.

## JSON Resume

- Spec: https://jsonresume.org/schema/
- License: MIT

The JSON Resume schema is an openly-published, vendor-neutral specification.
ProdMatch implements the v1.0.0 shape with permissive passthrough for
vendor extensions (the `x-prodmatch-*` keys under `meta` and `work[]`
preserve internal fields across import / export round-trips).

## MIT License (Scrapling) — reproduced for attribution

```
MIT License

Copyright (c) 2024 D4Vinci

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
