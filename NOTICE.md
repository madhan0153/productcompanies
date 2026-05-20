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
