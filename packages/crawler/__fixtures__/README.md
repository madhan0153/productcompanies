# Crawler golden fixtures

Each subdirectory here is a company slug. A complete fixture contains:

```
__fixtures__/<slug>/
  listing.html         — captured HTML snapshot of the listing markup
  fingerprints.json    — labelled reference element signatures
```

These files exist to give the crawler two superpowers:

1. **Parser regression tests** — `pnpm test:crawler` parses `listing.html`
   with the same selectors the live crawler uses, and asserts the parsed
   output is non-empty + well-formed. A CSS change on the career site that
   would silently produce zero jobs in production fails CI instead.

2. **Adaptive fallback** — when the live CSS selector returns zero matches,
   `packages/crawler/lib/adaptive.ts` walks the live DOM and finds elements
   whose fingerprint is most similar to the saved reference. This is the
   Scrapling-style "find_similar" pattern, re-implemented in TypeScript.
   See `/NOTICE.md` for attribution.

## What goes in a fixture

- **Public, structural HTML only.** Names of jobs, candidate names, recruiter
  contact info, and anything resembling PII must be redacted by hand before
  the snapshot is committed.
- **Just enough to exercise the parser.** ~10 cards is usually plenty.
- **No live cookies or session tokens.** A snapshot captured with curl or
  via View Source is correct; do not paste from a logged-in DevTools session.

## How to capture a new fixture

1. Open the official career page in a browser.
2. Save the listing markup as `listing.html` in `__fixtures__/<slug>/`.
3. Generate `fingerprints.json` by running the crawler with the in-development
   `--capture-fingerprints=<slug>` flag (TODO — current implementation
   exposes `captureFingerprints()` programmatically; the CLI flag is wired
   in a follow-up).
4. Hand-review the resulting JSON and make sure no PII leaked. Each
   `textShape` field is already redacted (letters→`w`, digits→`9`), but
   double-check `attrs` for stray IDs.
5. Commit both files. The CI parser test should pass against the snapshot.

## What lives outside this directory

- Live crawl HTML is *never* written to disk in production.
- Per-run logs go to `crawler_logs*.txt` (gitignored) and to Supabase
  `crawl_runs`.
- Element fingerprints captured from live runs are kept in memory and
  discarded; they are not persisted in this phase (see roadmap Phase C).
