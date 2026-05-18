# ProdMatch.ai — Resume Intelligence USP

Two product capabilities, one shared LLM pipeline. This is the platform's
**main differentiator** vs every other Indian job board (Naukri / Hirect /
Cutshort / LinkedIn). Most products score resumes; we **fix** them.

> **Hard ethics rule, repeated everywhere:**
> Never invent experience, technologies, projects, companies, dates, or
> metrics that aren't already in the source resume. The system improves
> *presentation* — phrasing, ordering, keyword surfacing, ATS structure —
> not *facts*. Authenticity is non-negotiable.

---

## 1. Capability A — "Enhanced Resume" (general / role-agnostic)

**Purpose:** After upload, the candidate gets a single one-time
enhancement that fixes universal weaknesses: weak verbs, missing
quantification, ATS-hostile formatting, vague headlines, sub-optimal
section order, keyword gaps for their *primary role function*.

**Trigger surfaces (UI):**
- `/profile` after upload → "Enhance my resume" CTA (1-click) below the
  Resume Score panel.
- `/dashboard` Next-Best-Action card when `resume_score < 70`.

**Inputs:**
- `profiles.resume_parsed` (existing)
- `profiles.resume_text` (raw extracted text — already stored)
- `profiles.role_function` + `profiles.target_role_functions`
- Optionally: top 10 must-have skills aggregated across the user's
  shortlist matches (gives the enhancement a "market-aware" keyword set
  without targeting a specific JD).

**Outputs:**
- `enhanced_resumes` row (new table — see §4)
- A side-by-side **diff view** (original bullet → enhanced bullet) the
  user must approve, edit, or reject per-change.
- Generated `.docx` AND `.pdf` in private storage bucket.
- An ATS-readability scorecard (before vs. after).

**Why this matters as USP:**
Every Indian engineer has a resume. Most have **never had it audited by
something that's read 10k+ product-co JDs**. ProdMatch has — that's the
asymmetric advantage no aggregator can replicate.

---

## 2. Capability B — "JD-Tailored Resume" (per-job)

**Purpose:** Given a specific job, produce a tailored version optimized
for that JD's must-haves, keywords, and recruiter signal. Already
partially exists in `apps/web/lib/llm/prompts/tailor-resume.ts` +
`tailored_resumes` table — this phase **overhauls** the system to:

1. **Minimal-modification mode** — keep the user's voice; only re-order
   sections and surface relevant content. Aggressive rewrites are an
   opt-in toggle.
2. **Per-change preview** before saving — same diff UI as Capability A.
3. **Tie tailoring decisions back to the JD** — every change has a
   visible "why" (e.g. *"Moved Kubernetes bullet to top — JD lists K8s
   as #1 must-have"*).
4. **Keep enhancement diff history** — undo any change, see prior
   versions (extends existing `resume_versions` pattern).

**Trigger surfaces (UI):**
- `/jobs/[id]` → existing **Apply Toolkit** "Tailored Resume" card,
  enhanced with the preview/diff flow.
- `/matches/jobs/[id]/tailor` (new dedicated review screen).

---

## 3. Shared LLM Pipeline (the engine behind both)

```
        ┌─────────────────────────────────────────────────┐
        │  Step 1 — DIAGNOSIS                             │
        │  Detect weaknesses. No writing yet.             │
        │  Heavy tier (Flash, JSON schema enforced).      │
        └─────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │  Step 2 — TARGETED REWRITES (per bullet)        │
        │  For each weak bullet identified, generate 1-3  │
        │  alternative phrasings. Bullet-scoped prompts.  │
        │  Heavy tier, batched (5-10 bullets per call).   │
        └─────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │  Step 3 — ATS SCORING (deterministic, no LLM)   │
        │  Section presence, header hygiene, keyword      │
        │  density per role function. Pure TypeScript.    │
        └─────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │  Step 4 — DOCX/PDF RENDERING (deterministic)    │
        │  Existing docx generator extended with PDF.     │
        └─────────────────────────────────────────────────┘
```

### Step 1 — Diagnosis prompt
Outputs a structured weakness report:

```ts
interface ResumeDiagnosis {
  overall_grade: "A" | "B" | "C" | "D";
  ats_risks:        Array<{ severity: 1|2|3; issue: string; where: string }>;
  weak_bullets:     Array<{
    section: "summary" | "experience" | "projects";
    company?: string;       // when from experience
    bullet_index: number;   // index within section so we can patch
    original: string;
    weakness: "no_metric" | "weak_verb" | "vague_scope" | "passive_voice"
              | "tense_drift" | "keyword_gap" | "redundancy";
    severity: 1 | 2 | 3;
  }>;
  missing_keywords: Array<{
    keyword: string;
    presence: "absent" | "weak";   // "weak" = mentioned once in passing
    rationale: string;             // why this matters for the target role
  }>;
  recruiter_concerns: string[];   // 2-5 plain-language readability flags
}
```

**Rules in the prompt:**
- "Do NOT invent any fact. Only flag bullets that are demonstrably weak
  in the source."
- "Quote the original bullet verbatim in `original` — used for diff matching."

### Step 2 — Rewrite prompt (per bullet)
Input: original bullet + weakness type + role function + (for Capability
B) the JD must-haves.
Output: 1-3 alternative phrasings + a one-line justification each. The
alternatives are **strictly faithful** rewrites:

```ts
interface BulletRewrite {
  original: string;
  alternatives: Array<{
    text: string;
    why: string;            // "Surfaces 'Kafka' which JD lists as must-have"
    risk_flag: null | "may_overclaim" | "metric_inferred";
  }>;
}
```

**Critical guard rails:**
- The rewrite prompt sees ONLY the bullet's text + the weakness label +
  optional JD keywords. It does NOT see the resume's other bullets — so
  it can't accidentally graft a metric from a different role.
- If the model returns text containing a number that wasn't in the
  source bullet → `risk_flag = "metric_inferred"` and the UI displays
  a warning that requires the user's explicit acknowledgment.

### Step 3 — ATS scoring (deterministic, no LLM)
Builds on existing `lib/matching/resume-score.ts`. New axes:
- **Section presence** (Contact, Summary, Skills, Experience, Education)
- **Heading hygiene** (no fancy unicode, no two-column layouts, no images)
- **Keyword density** (must-haves for the candidate's role function:
  e.g. backend → "REST", "API", "microservices", etc.)
- **Date format consistency** (all roles use same `MMM YYYY` format)
- **Verb diversity** (no repeated lead verbs across consecutive roles)

Output drives a side-by-side **before/after** in the UI.

### Step 4 — Rendering
- **DOCX:** extend `lib/docx/tailored-resume.ts` to also render the
  enhanced version. Same renderer, different content.
- **PDF:** new. Use `docx` → server-side conversion via headless Chrome
  (Playwright already a dep) OR `libreoffice-soffice` in the Vercel
  runtime. **Recommendation:** generate HTML → use Playwright print
  to PDF since Playwright is already bundled for the crawler. One
  reusable Chromium pool, no new runtime dep.

---

## 4. Database Changes (idempotent SQL)

All changes appended to `supabase/schema.sql` — single-file rule.

### 4.1 `enhanced_resumes` (new)
```sql
create table if not exists public.enhanced_resumes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Snapshot of inputs at generation time
  source_resume_signature text not null,   -- equals profiles.resume_signature
  target_role_function    text,            -- snapshot of profile.role_function
  market_keywords         text[],          -- top-N skills sampled from user's shortlist

  -- LLM outputs (JSON)
  diagnosis    jsonb not null,             -- ResumeDiagnosis
  rewrites     jsonb not null,             -- Map<bullet_index, BulletRewrite[]>
  ats_before   jsonb not null,             -- AtsScorecard
  ats_after    jsonb,                      -- populated after user accepts changes

  -- User's per-change decisions (so we know what was accepted)
  decisions    jsonb not null default '{}'::jsonb,
                                            -- Map<bullet_index, { accepted_alt_id | "kept" | "edited"; final_text }>

  -- Persisted outputs
  enhanced_content    jsonb,               -- TailoredResumeContent-shape; computed when user finalises
  docx_storage_path   text,
  pdf_storage_path    text,
  status              text not null default 'pending_review',
                                           -- 'pending_review' | 'finalised' | 'discarded'

  generated_at        timestamptz not null default now(),
  finalised_at        timestamptz,
  updated_at          timestamptz not null default now(),

  -- One pending enhancement per user at a time; finalised ones are kept.
  unique (user_id, source_resume_signature, status)
    deferrable initially deferred
);

create index if not exists idx_enhanced_resumes_user
  on public.enhanced_resumes(user_id, generated_at desc);
```
+ trigger on `updated_at`, + RLS policy `enhanced_resumes_select_own`
mirroring `tailored_resumes` policies, + storage path policies.

### 4.2 Storage bucket `enhanced-resumes` (private, owner-only read)
```sql
insert into storage.buckets (id, name, public)
values ('enhanced-resumes', 'enhanced-resumes', false)
on conflict (id) do nothing;

-- RLS policies via storage.policies — owner-read-only, mirror the
-- 'tailored-resumes' bucket exactly.
```

### 4.3 Augment `tailored_resumes` (existing)
Add columns for the new diff-preview workflow without breaking back-compat:

```sql
alter table public.tailored_resumes
  add column if not exists diagnosis jsonb,        -- Step 1 output
  add column if not exists rewrites  jsonb,        -- Step 2 outputs
  add column if not exists decisions jsonb         -- user's per-change accepts/rejects
                              default '{}'::jsonb,
  add column if not exists pdf_storage_path text,
  add column if not exists status text not null default 'finalised';
                              -- 'pending_review' | 'finalised' | 'discarded'
```

(Existing rows get `status = 'finalised'` from the default; nothing to
backfill.)

### 4.4 `resume_intel_events` (audit / cost telemetry)
```sql
create table if not exists public.resume_intel_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null,                    -- 'diagnosis' | 'rewrite_batch' | 'render' | 'finalise'
  scope        text not null,                    -- 'enhanced' | 'tailored'
  scope_ref_id uuid,                              -- enhanced_resumes.id or tailored_resumes.id
  llm_tier     text,                              -- 'heavy' | 'light' | null
  llm_keys_used  smallint default 0,
  cost_tokens_in   integer,
  cost_tokens_out  integer,
  latency_ms       integer,
  ok           boolean not null,
  error_kind   text,                              -- LlmRunError.detail.kind
  created_at   timestamptz not null default now()
);

create index if not exists idx_resume_intel_events_user
  on public.resume_intel_events(user_id, created_at desc);
```

Used for: (a) cost ceiling enforcement, (b) DPDP audit (records what
the user ran without storing resume content), (c) ops dashboard.

---

## 5. Server Actions (new)

All under `apps/web/app/(app)/profile/enhance-actions.ts` (new) and
extensions to `apps/web/app/(app)/jobs/[id]/toolkit-actions.ts`.

```ts
// Capability A
diagnoseEnhancement(): Promise<{ ok: true; id: string } | { ok: false; error: string }>
applyDecisions(id: string, decisions: Decisions): Promise<{ ok: true } | { ok: false; error: string }>
renderEnhancement(id: string): Promise<{ ok: true; docxUrl: string; pdfUrl: string } | { ok: false; error: string }>
discardEnhancement(id: string): Promise<{ ok: true } | { ok: false; error: string }>

// Capability B — additions to existing toolkit-actions
diagnoseTailored(jobId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>
applyTailoredDecisions(jobId: string, decisions: Decisions): Promise<{ ok: true } | { ok: false; error: string }>
// existing generateTailoredResume() stays for the "auto-accept-all" fast path
```

**Quota / cost discipline:**
- Hard cap: 3 enhancement runs per user per 30-day window. Tracked in
  `resume_intel_events` (kind='diagnosis').
- Hard cap: 25 tailored-resume diagnoses per user per 30-day window.
- Both caps surface a friendly "Coming back in N days" message; the
  user can finalise an existing pending run any time without spending
  quota.
- The actual LLM call uses the existing `runWithRetry()` quota wrapper;
  failures degrade gracefully — Step 1 (diagnosis) is required, Step 2
  is best-effort, Step 3 (ATS scoring) is local so always works.

---

## 6. UI flows

### 6.1 Enhanced Resume — `/profile`
```
[Resume Score panel]
  ↓ user clicks "Enhance my resume"
[Loading skeleton: ~12s] ← Step 1 diagnosis runs
  ↓
[Review screen: /profile/enhance]
  ┌─────────────────────────────────────────────────┐
  │  Overall grade: B → A potential                 │
  │  ATS risks (3) ▾                                │
  │  Recruiter concerns (2) ▾                       │
  ├─────────────────────────────────────────────────┤
  │  Bullet 1 — at Razorpay                         │
  │  ORIGINAL: "Worked on backend systems"          │
  │  ┌─ Suggestion 1 ────────────────────────────┐  │
  │  │ "Owned payment-flow backend serving 5M+   │  │
  │  │  monthly users on a Go/Kafka stack."      │  │
  │  │ Why: surfaces scale + stack from your     │  │
  │  │ summary section.                          │  │
  │  │ [ Accept ] [ Edit ] [ Skip ]              │  │
  │  └───────────────────────────────────────────┘  │
  │  ⚠️ Risk flag: "5M+" inferred from your        │
  │     summary. Confirm only if accurate.          │
  ├─────────────────────────────────────────────────┤
  │  ... (more bullets) ...                         │
  ├─────────────────────────────────────────────────┤
  │  [Finalise & generate] [Save draft] [Discard]   │
  └─────────────────────────────────────────────────┘
```

On finalise: render docx + pdf, signed-URL the downloads, optionally
write to `resume_versions` as a new snapshot. The original parsed
resume is **never** overwritten without explicit user action ("Replace
my profile resume with this version" — extra confirmation step).

### 6.2 Tailored Resume — `/jobs/[id]`
Same diff-review pattern, but with two visible modes:
- **Polish mode (default):** minimal phrasing changes + reordering;
  same content, JD-aligned emphasis.
- **Tailor mode:** rewrites bullets to surface JD-relevant signals;
  still derivable from source.

The user picks mode at the diagnosis call. Mode is persisted on
`tailored_resumes.decisions.mode` so re-runs respect it.

---

## 7. Prompts (text outline, no actual prompt strings here)

### Diagnosis prompt (heavy tier, JSON schema enforced)
- System role: "You are an ATS expert and product-company recruiter."
- Input: resume text + role function + top 30 market keywords
- Output schema: `ResumeDiagnosis`
- Constraints in prompt body:
  - "Quote bullets verbatim in `original` field for matching."
  - "Do NOT propose rewrites here — that's a separate step."
  - "Flag at most 12 weak bullets — focus on highest-impact wins."

### Rewrite prompt (heavy tier, batched)
- Input: list of `{ bullet, weakness_label, role_function, jd_must_haves? }`
- Output: list of `BulletRewrite`
- Constraints:
  - "Use ONLY facts present in the bullet. No new technologies,
     metrics, dates, scale numbers, or company-internal claims."
  - "If you suggest a numeric metric not in the bullet, set
     `risk_flag = 'metric_inferred'`."
  - "If a tech keyword you add isn't in the source bullet but IS
     present in the resume's overall tech_stack, that's allowed —
     but set `risk_flag = 'may_overclaim'`."

Both prompts go through the existing `runWithRetry('heavy', ...)` wrapper
in `packages/shared/src/llm/gemini.ts`. No new LLM infra needed.

---

## 8. PDF generation choice

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Playwright print-to-PDF | Already a dep; deterministic; HTML/CSS control | Cold-start ~2s; ~50MB Chromium image | ✅ Use this |
| `libreoffice-soffice` | Native .docx → PDF | New runtime dep; not Vercel-friendly | ❌ |
| `pdfkit` / `pdf-lib` | Pure JS; small | Hand-rolled layout; no auto pagination of long resumes | ❌ |
| Browser-side `html2pdf` | Zero server cost | Different render across browsers; loses control | ❌ |

Implementation: render the resume as semantic HTML (existing
`tailored-resume.ts` already builds the docx; add an HTML renderer
sharing the same `TailoredResumeContent` schema) → Playwright loads
the HTML → `page.pdf()`.

---

## 9. DPDP / Ethics integration

1. **New consent purpose `resume_intelligence`** added to
   `consent_purpose` enum. Required to run diagnosis. Default off —
   user opts in on the enhancement landing screen.
2. **Audit events** in `dpdp_events`:
   - `resume_intel_started` (kind = 'enhancement' | 'tailored')
   - `resume_intel_finalised`
   - `resume_intel_discarded`
3. **Export endpoint** (`/api/export`) includes all `enhanced_resumes`
   and `tailored_resumes` content + signed storage files.
4. **Erasure** cascades via existing `on delete cascade` chain
   (auth.users → profiles → enhanced_resumes/tailored_resumes → storage).
5. **PII boundary:** we already follow "never log resume content"; the
   new server actions reuse that discipline. Telemetry records
   structural fields (counts, severities), never the bullet text.
6. **Authenticity claim** rendered prominently in UI: "We never invent
   experience. Every change traces back to your source resume."

---

## 10. Cost model (Gemini free-tier)

Per enhancement run:
- 1× diagnosis call    → ~3-6k tokens out
- 2-3× rewrite batches → ~5-10k tokens total
- Total ≈ 10-16k output tokens / run

Per tailored resume diagnosis run:
- 1× diagnosis call    → ~3-5k tokens out
- 1-2× rewrite batches → ~3-6k tokens total
- Total ≈ 6-11k tokens / run

With the user-side quotas (3 enhancements / 25 tailored per 30d) and
3 Gemini keys × ~200 RPD free tier ≈ 600 daily request capacity, we
can support ~100 simultaneous users on the free tier before needing a
paid Gemini key. Existing `runWithRetry` key-rotation + model-cascade
handles overflow gracefully.

---

## 11. Implementation phases

### Phase R1 — Foundation (2-3 days)
- [ ] SQL: append §4 tables + RLS + bucket policies to `supabase/schema.sql`
- [ ] Apply directly to cloned DB (using stored credentials)
- [ ] Add `resume_intelligence` to `consent_purpose` enum + `dpdp_events` types
- [ ] `lib/llm/prompts/resume-diagnose.ts` (Step 1 prompt + schema)
- [ ] `lib/llm/prompts/bullet-rewrite.ts` (Step 2 prompt + schema)
- [ ] `lib/matching/ats-scorecard.ts` (Step 3 deterministic scoring)
- [ ] `lib/render/resume-html.ts` (HTML renderer shared by docx/pdf)
- [ ] `lib/render/resume-pdf.ts` (Playwright print-to-PDF)

### Phase R2 — Capability A: Enhanced Resume (3-4 days)
- [ ] `app/(app)/profile/enhance-actions.ts` (server actions)
- [ ] `app/(app)/profile/enhance/page.tsx` (review UI)
- [ ] `app/(app)/profile/enhance/loading.tsx` (skeleton with stages)
- [ ] `components/diff-review/` (reusable per-bullet diff card)
- [ ] Hook into `/profile` Resume Score panel ("Enhance" CTA)
- [ ] Hook into `/dashboard` Next-Best-Action card
- [ ] DPDP consent toggle on Settings → Privacy

### Phase R3 — Capability B: JD-Tailored Resume overhaul (2-3 days)
- [ ] Extend `toolkit-actions.ts` with `diagnoseTailored` / `applyTailoredDecisions`
- [ ] `app/(app)/jobs/[id]/tailor/page.tsx` (review UI — reuses diff-review components)
- [ ] Update Apply Toolkit card to surface "Review changes" vs old "Generate" CTA
- [ ] Persist mode (`polish` vs `tailor`) on `tailored_resumes.decisions`
- [ ] Show "Why each change" inline tied to JD must-haves

### Phase R4 — Polish + trust (1-2 days)
- [ ] "Risk flag" warnings in the UI for `metric_inferred` / `may_overclaim`
- [ ] Side-by-side ATS scorecard (before/after) on the review screen
- [ ] Resume version history extended with enhanced versions
- [ ] Cost dashboard at `/admin/health` showing per-user spend
- [ ] Playwright E2E spec for the full enhance → review → finalise flow

### Phase R5 — Optional ML loop (later)
- Track which suggestions get `accepted` vs `skipped` per role function.
- Use as a feedback signal for the rewrite prompt's few-shot examples.
- Eventually: fine-tune a smaller model on accepted rewrites; cuts cost
  ~5×.

---

## 12. Non-goals (explicit)

To prevent scope creep — these are **out of scope** for the resume
intelligence USP:

1. **Interview-prep / coaching content rewrites** (`/coach` is its own
   surface; resume intel doesn't touch it).
2. **Real-time collaborative editing** of the enhanced resume — the
   user picks per-bullet decisions, finalises, downloads. No
   text-editor.
3. **External integrations** (LinkedIn import, Google Drive). Resume
   PDF upload remains the only entry point.
4. **Multilingual resume generation** — English only at launch.
5. **Resume parsing from non-PDF** (Word, image, LaTeX). PDF only.
6. **Career-pivot rewrites** (e.g. backend → PM). The system targets
   tightening within a role, not crossing roles. Cross-role tailoring
   would require shifting facts and breaks the authenticity rule.

---

## 13. Success metrics

| Metric | Target | How measured |
|---|---|---|
| % users finalising an enhancement within 7d of upload | 35% | `enhanced_resumes.status='finalised'` / unique uploaders |
| Avg accepted-rewrite ratio per run | ≥ 60% | from `decisions` jsonb |
| ATS score lift (before → after) | +15 points avg | `ats_before` vs `ats_after` |
| Tailored-resume usage on top-25 matches | 25% | tailored rows / strong-fit matches |
| Quota-exhaustion errors | < 0.5% of runs | `resume_intel_events.error_kind` |
| User-reported "felt authentic" survey | ≥ 4.2 / 5 | weekly digest follow-up |

---

## 14. Open decisions (need user input before Phase R1 starts)

1. **Per-30-day quotas: 3 / 25 — too tight, too loose?**
   Lower numbers protect Gemini free-tier; higher numbers protect
   retention. Recommendation: start at 3/25, tune from real usage.
2. **Default mode for Capability B: Polish or Tailor?**
   Polish is the safer / more authentic default; Tailor produces
   bigger ATS lift. Recommendation: Polish — surface Tailor as opt-in
   with the risk flags visible.
3. **Auto-update profile resume after finalise?**
   Three options: (a) never, (b) prompt user, (c) auto-replace.
   Recommendation: (b) — prompt with the existing
   `resume_versions` snapshot semantics so it's always reversible.
4. **PDF rendering: server-side (Playwright) or queue to GitHub
   Actions?** Playwright cold-start is ~2s on Vercel; acceptable for
   a "render" button but not for inline preview. Recommendation:
   server-side, with a clear "Generating PDF…" skeleton.
5. **Should `enhanced_resumes` results be tied to a specific
   `resume_signature`?** Currently scoped that way; means re-uploading
   the same resume invalidates pending enhancements. Recommendation:
   yes — uploads always start fresh, prevents stale review screens.

---

**End of spec.** The full file is checked in at the repo root so we can
diff future revisions and use it as the implementation tracker.
