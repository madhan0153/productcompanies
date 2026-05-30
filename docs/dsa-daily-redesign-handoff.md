# DSA Lab — Daily Reading Experience · Design Handoff

**Surface:** `/dsa` (index/daily hub) + `/dsa/[slug]` (question detail)
**Direction:** Enterprise Calm — restrained, typography-driven, trustworthy. Linear / Vercel / Stripe, never Web3.
**Goal:** One fresh, role-personalized question per day → a habit-forming, premium *reading* experience that converts Free → Pro → Career Sprint.

This handoff is grounded in the **real, shipped tokens and components** in `apps/web` (verified against `globals.css`, `tailwind.config.ts`, `components/section-card.tsx`, `components/billing/upgrade-modal.tsx`). Every class below already exists. No new fonts, no new colors, no shadcn.

---

## 0. Token & component contract (reuse only)

| Need | Use exactly | Source |
|---|---|---|
| Body / UI font | `font-sans` (Inter) — default | `tailwind.config.ts` |
| Headings | `font-display` (Outfit), weights 500/600/700/800; `h1..h4` auto-apply display + `-0.018em` tracking | `globals.css` |
| Accent | `text-primary` / `bg-primary` / `bg-primary-soft text-primary-soft-foreground` (indigo hue 232) | tokens |
| Card chrome | `.surface`, `.surface-elevated`, `.surface-inset`, or `rounded-xl border border-border bg-card` | `globals.css` |
| Section panel | `<SectionCard title subtitle icon badge footer>` | `components/section-card.tsx` |
| Stat tile | `<StatCard icon label value sub tone href>` — tones `primary\|success\|warning\|destructive` | same file |
| Pills | `rounded-full px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground` | current `/dsa` |
| Difficulty | easy `bg-emerald-500/10 text-emerald-600`, medium `bg-amber-500/10 text-amber-600`, hard `bg-rose-500/10 text-rose-600` (+ `dark:` variants) | current `/dsa` |
| Radius | `rounded-lg` 10px · `rounded-xl` 14px · `rounded-2xl` 18px · `rounded-3xl` 24px | tokens |
| Elevation | `elev-1` default, `elev-2` lifted, `shadow-pop` overlays only | tokens |
| Motion | `.lift` (hover, desktop only), `.press` (tap scale .98), `animate-fade-up`, `animate-scale-in`, `animate-slide-up`, `animate-pulse-soft`; ease `cubic-bezier(0.22,1,0.36,1)` | tokens |
| Tap targets | `.tap-target` (44px), `.tap-target-sm` (36px) | tokens |
| Upgrade flow | `<UpgradeModal trigger=… returnTo=…>` → `/api/billing/checkout` with `pro_monthly` / `career_sprint_monthly` | `components/billing/upgrade-modal.tsx` |
| Price copy | `PRICING_COPY.proPerDay` (₹3/day), `proMonthly`, `sprintPerDay`, `sprintMonthly` | `lib/billing/catalog` |

**Reduced motion:** every animation already collapses under `@media (prefers-reduced-motion: reduce)` globally. Framer components must also call `useReducedMotion()` (matches `UpgradeModal`).

**Mobile-first:** all specs target **390px** first; `sm:` (≥640) and `lg:` (≥1024) are progressive enhancements. The app already renders inside the `container` (px 1rem→1.5rem→2rem) within `app-shell`.

---

## 1. Product model shift

The current `/dsa` is a **browse-all catalog** (featured pick + grouped-by-pattern grid) with an **ungated** 3-stage reveal. The redesign changes the mental model:

```
OLD: catalog of N questions, browse freely, read everything
NEW: ONE question today · progressive reveal · tier-gated depth · streak loop
```

The pattern-grouped catalog **does not disappear** — it becomes **Company Deep Dive Tracks** and **Bonus Practice**, which are themselves monetized surfaces. The free daily question stays the hero.

### Entitlements the UI must read (new `useDsaEntitlements()` hook → server)

```ts
type DsaEntitlements = {
  tier: "free" | "pro" | "sprint";
  streak: { current: number; longest: number; lastSolvedDate: string | null };
  freezeTokens: { available: number; nextAccrualInDays: number };
  skips: { usedThisPeriod: number; allowance: number; periodLabel: "week" | "day" };
  fullApproachesThisMonth: { used: number; allowance: number | "unlimited" }; // free=3
  bonusToday: { used: number; allowance: number | "unlimited" }; // free=0, pro=5, sprint=∞
  today: {
    slug: string;
    status: "not_started" | "in_progress" | "solved";
    dayNumber: number;          // user's personal day index (Day 1 = onboarding)
    nextRefreshIso: string;     // for the countdown
  };
  personalization: {            // drives "Why for you"
    matchedCompanies: { name: string; roleCount: number }[];
    rationale: string;          // 1 sentence, server-generated, never PII
  };
};
```

All gating is **server-authoritative**; the client only *presents* locks. Never trust the client to hide solutions — Java/C++ strings for a Free user are **not sent to the browser**.

---

## 2. `/dsa` — Daily Hub

### 2.1 Mobile (390px) — Free tier, mid-streak (the most common screen)

```
┌─────────────────────────────────────────┐  ← container, py-2 space-y-6
│ DSA LAB · DAY 6              🔥 5        │  ← eyebrow row + streak chip (top-right)
│ Good evening, Madhan.                    │  h1 (font-display)
│                                          │
│ ┌─────────────────────────────────────┐ │  ← 7-day streak ribbon (SectionCard-less, inset)
│ │ M  T  W  T  F  S  S                  │ │
│ │ ✓  ✓  ✓  ✓  ✓  ●  ·    5-day streak │ │  filled dots = solved, ● = today, · = future
│ │ ❄ 1 freeze · refills in 4d          │ │  freeze token line
│ └─────────────────────────────────────┘ │
│                                          │
│ ┏━━━━━━━━━━━━━ TODAY ━━━━━━━━━━━━━━━━━┓ │  ← HERO CARD (surface-elevated, primary-tinted top)
│ ┃ ✨ Today's question        ~35 min  ┃ │
│ ┃ Largest Single-Color Run Along a    ┃ │  h2, font-display, text-xl
│ ┃ Pipeline Path                        ┃ │
│ ┃                                      ┃ │
│ ┃ A data pipeline is a directed graph ┃ │  framing teaser, line-clamp-3
│ ┃ of stages… find the longest single- ┃ │
│ ┃ color run on any path.               ┃ │
│ ┃                                      ┃ │
│ ┃ [hard] [Graphs] [Pure DSA]          ┃ │  pills row, flex-wrap gap-2
│ ┃                                      ┃ │
│ ┃ ┌ Why this is for you ────────────┐ ┃ │  ← personalization strip (primary-soft)
│ ┃ │ ◆ Matches 4 Razorpay backend    │ ┃ │
│ ┃ │   roles you're a strong fit for. │ ┃ │
│ ┃ └──────────────────────────────────┘ ┃ │
│ ┃                                      ┃ │
│ ┃ [  Start today's question  → ]      ┃ │  primary CTA, full-width, tap-target
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                          │
│ ┌──────────┬──────────┬──────────┐      │  ← daily utilities row (3 compact buttons)
│ │ ⤼ Skip   │ ❄ Freeze │ 🧠 Recall│      │  each shows quota sublabel
│ │ 1 left/wk│ 1 token  │ Monthly  │      │
│ └──────────┴──────────┴──────────┘      │
│                                          │
│ ── Your progress ──                      │
│ ┌──────────┬──────────┐                  │  ← StatCard 2-col (sm:4-col)
│ │ 🔥 5     │ 🏆 12    │                  │
│ │ Current  │ Longest  │                  │
│ ├──────────┼──────────┤                  │
│ │ ✅ 34    │ 🎯 88%   │                  │
│ │ Solved   │ Recall   │                  │
│ └──────────┴──────────┘                  │
│                                          │
│ ┌─ 🔒 Bonus practice ─────────────────┐ │  ← LOCKED teaser (Free)
│ │ 5 extra questions a day with Pro.    │ │
│ │ [ Unlock with Pro · ₹3/day → ]      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ 🔒 Company Deep Dive tracks ───────┐ │  ← LOCKED teaser (Free)
│ │ Razorpay · PhonePe · Swiggy +2       │ │  show matched-company logos/initials
│ │ Curated 30-problem prep tracks.      │ │
│ │ [ Explore tracks → ]                │ │  opens UpgradeModal(trigger=dsa_company_track)
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ 🔒 Interview Countdown ────────────┐ │  ← Sprint-only teaser
│ │ Got an interview date? Get a daily   │ │
│ │ plan that counts down to it.         │ │
│ │ [ Career Sprint → ]                 │ │
│ └──────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.2 Desktop (≥1024px) — two-column

```
┌───────────────────────────────────────────────────────────────────────────┐
│ DSA LAB · DAY 6                                              🔥 5  ❄ 1     │
│ Good evening, Madhan.                                                       │
├──────────────────────────────────────────────┬────────────────────────────┤
│  HERO CARD (col-span-8)                        │  RAIL (col-span-4)         │
│  ┏━━━━━━━━━━━━━━━ TODAY ━━━━━━━━━━━━━━━━━━━━┓ │  7-day ribbon              │
│  ┃ ✨ Today's question              ~35 min ┃ │  ┌──────┬──────┐           │
│  ┃ Largest Single-Color Run …               ┃ │  │🔥 5  │🏆 12 │  stats    │
│  ┃ framing teaser (2 lines)                  ┃ │  ├──────┼──────┤           │
│  ┃ [hard][Graphs][Pure DSA]                  ┃ │  │✅ 34 │🎯88% │           │
│  ┃ ◆ Why for you: 4 Razorpay roles           ┃ │  └──────┴──────┘           │
│  ┃ [ Start today's question → ]              ┃ │  ── utilities ──           │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │  Skip · Freeze · Recall    │
│  Bonus practice (locked)                       │  Deep Dive tracks (locked) │
│  Company tracks · Interview countdown          │  AI Coach digest (tiered)  │
└──────────────────────────────────────────────┴────────────────────────────┘
```

Grid: `lg:grid lg:grid-cols-12 lg:gap-6`; hero `lg:col-span-8`, rail `lg:col-span-4`. Mobile stacks in the order shown in 2.1 (hero first — never push it below the fold).

### 2.3 Hero card — exact spec

```tsx
<section className="surface-elevated overflow-hidden rounded-2xl lift">
  {/* tinted cap — the ONLY decorative fill on the page */}
  <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-5 pt-5 sm:px-6">
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-4 w-4" /> Today's question
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">~{minutes} min</span>
    </div>
    <h2 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{framing}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <DifficultyPill d={difficulty} /> <Pill>{pattern}</Pill> <Pill>{bucket}</Pill>
    </div>
  </div>

  {/* personalization strip */}
  <div className="mx-5 mt-4 rounded-xl bg-primary-soft px-3.5 py-3 sm:mx-6">
    <p className="flex gap-2 text-xs leading-relaxed text-primary-soft-foreground">
      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{personalization.rationale}</span>
    </p>
  </div>

  {/* CTA */}
  <div className="p-5 pt-4 sm:p-6">
    <Link href={`/dsa/${slug}`}
      className="press tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring">
      {status === "not_started" ? "Start today's question"
        : status === "in_progress" ? "Resume today's question"
        : "Review today's question"}
      <ArrowRight className="h-4 w-4" />
    </Link>
    {status === "solved" && <NextRefreshCountdown iso={nextRefreshIso} />}
  </div>
</section>
```

**Status affordance:** add a thin top accent — `not_started`: none; `in_progress`: `before:` 2px `bg-warning` left edge + "In progress" micro-label; `solved`: `bg-success` edge + ✓ "Solved · Day 6" and the countdown replaces the framing teaser ("Next question in 14h 22m").

### 2.4 Streak ribbon — exact spec

```tsx
<div className="surface-inset flex items-center justify-between gap-3 px-4 py-3">
  <div className="flex items-center gap-1.5">
    {last7.map((day) => (
      <span key={day.iso} aria-label={day.label}
        className={
          day.state === "solved" ? "h-2.5 w-2.5 rounded-full bg-primary"
          : day.state === "frozen" ? "h-2.5 w-2.5 rounded-full bg-sky-400/70"   // ❄ uses sky tint within palette
          : day.state === "today" ? "h-2.5 w-2.5 rounded-full bg-primary/40 ring-2 ring-primary animate-pulse-soft"
          : day.state === "missed" ? "h-2.5 w-2.5 rounded-full bg-destructive/30"
          : "h-2.5 w-2.5 rounded-full bg-border"                                 // future
        } />
    ))}
  </div>
  <div className="text-right">
    <p className="text-xs font-semibold tabular-nums">{current}-day streak</p>
    <p className="text-[11px] text-muted-foreground">❄ {freeze} freeze · refills in {nextAccrual}d</p>
  </div>
</div>
```

> Note on the streak flame: the brief allows only existing tokens. The 🔥 is a **Lucide `Flame` icon in `text-warning`** (amber `32 92% 48%`), not a new color. Frozen days reuse a desaturated sky tint that already reads within the neutral palette; if stricter, swap to `text-muted-foreground` + a snowflake glyph.

### 2.5 Streak chip (top-right, persistent)

```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning tabular-nums">
  <Flame className="h-3.5 w-3.5" /> {current}
</span>
```

On a milestone day (3, 5, 7, 14, 30, 50, 100) it plays `animate-scale-in` once on mount and shows a one-time toast (§6).

---

## 3. `/dsa/[slug]` — Question detail + progressive reveal

The reading spine (Problem → Examples) is **always full and free** — depth and breadth are what's gated. Order, top to bottom:

```
back · pills · title · framing · "why for you" chip · Day badge
─ Problem (statement, input/output, constraints)        [FREE · full]
─ Examples                                              [FREE · full]
─ Stage 1: Approach                                     [gated by tier]
─ Stage 2: Solution steps                               [gated by tier]
─ Stage 3: Solution code (Py / Java / C++)              [gated by tier]
─ AI Coach reflection                                   [gated by tier]
─ Pitfalls · Edge cases · Why it matters                [FREE · full → retention]
─ Completion footer (streak earned + next-refresh)
```

### 3.1 Reveal state machine (per tier)

| Stage | Free | Pro (₹99) | Career Sprint (₹499) |
|---|---|---|---|
| **Approach** | Summary + first 2–3 bullets, rest blurred → inline paywall. **Cap: 3 full approaches/month** (counter shown). | Full approach | Full + **AI Coach personalized insight** callout |
| **Solution steps** | Locked behind same approach gate | Full | Full |
| **Code** | **Python only**; Java/C++ tabs locked | Python + Java + C++ | + **line-by-line annotations** toggle |
| **AI Coach** | none (CTA to Pro) | Weekly digest entry | Daily personalized reflection inline |
| Pitfalls / Edge / Why | Full | Full | Full |

### 3.2 Approach — Free (partial + paywall)

```
┌─ 💡 Approach ───────────────────────────┐  ← SectionCard
│ Process nodes in topological order…      │  bullet 1  (shown)
│ Keep dp[node][c] = max count of color c… │  bullet 2  (shown)
│ When a node is finalized, add its color… │  bullet 3  (shown)
│ ┌───────────────────────────────────────┐│
│ │ ░░░░░░░░░░░░ blurred bullets ░░░░░░░░░ ││  ← remaining steps, blur-sm + mask
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ││
│ └───────────────────────────────────────┘│
│ ┌───────────────────────────────────────┐│  ← inline paywall (primary-soft)
│ │ 🔓 Want the full step-by-step          ││
│ │    explanation?                        ││
│ │    Pro is only ₹3.30/day.              ││
│ │    [ Unlock full approach → ]          ││  → UpgradeModal(trigger="dsa_full_approach")
│ │    2 of 3 free approaches left this mo. ││  ← only when cap not yet hit
│ └───────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

Blur treatment (reduced-motion safe, no new color):

```tsx
<div className="relative">
  <ul className="select-none blur-[5px] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
    {hiddenBullets.map(...)}
  </ul>
  <InlinePaywall trigger="dsa_full_approach" remaining={fullApproachesLeft} />
</div>
```

> **Free with cap remaining**: the first 2–3 bullets are real content (genuine value), and if the user *spends* one of their 3 monthly full-approach credits, the gate dissolves with `animate-fade-up` and the credit counter decrements. **Cap exhausted**: the whole approach (beyond the teaser) is the paywall — no "spend a credit" option, only upgrade.

### 3.3 Solution code — Free (Python only)

```
┌─ </> Solution ──────────────────────────┐
│ [ Python ] [ 🔒 Java ] [ 🔒 C++ ]        │  ← lang tabs; locked tabs muted + lock glyph
│ ┌───────────────────────────────────────┐│
│ │ from collections import deque          ││  Python shown in full, free
│ │ def largest_path_value(colors, edges): ││
│ │   …                                    ││
│ └───────────────────────────────────────┘│
│ Time O((V+E)·26) · Space O(V·26)         │
│ ┌───────────────────────────────────────┐│
│ │ ⚡ See the same optimal solution in    ││  ← appears when a locked tab is tapped
│ │    Java and C++ instantly with Pro.    ││
│ │    [ Unlock all languages → ]         ││  → UpgradeModal(trigger="dsa_other_langs")
│ └───────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

Tapping a 🔒 tab does **not** switch panes; it expands the inline paywall under the code with `animate-fade-up` and the locked tab gets a brief `.press` + `ring-1 ring-primary/40`. The Java/C++ strings are never shipped to a Free client.

Code block keeps the current treatment: `overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed font-mono`. Add a top bar with a **Copy** button (`tap-target-sm`, `Check` confirm on copy) — Pro/Sprint only; Free copy of Python is allowed (Python is the free deliverable).

### 3.4 Solution code — Sprint (line-by-line annotations)

Add an **"Annotate"** toggle (segmented, reusing the lang-tab button style). On: each line gets a hover/tap-reveal margin note; mobile renders notes as a numbered list beneath the block (no hover on touch). Annotation source = a new per-question `code_annotations` field (out of scope for this visual handoff; design assumes its presence).

### 3.5 AI Coach reflection

- **Free:** collapsed card — `🔒 AI Coach reflects on your solve patterns. Daily on Career Sprint.` → `UpgradeModal(trigger="dsa_ai_coach")`.
- **Pro:** card noting "Saved to your **weekly digest** — arrives Sunday." with a peek of the digest.
- **Sprint:** inline personalized paragraph (server-generated, references the user's role match + recall history), styled in `surface-inset` with a small `Sparkles` + "AI Coach" label in `text-primary`.

### 3.6 Completion footer

When the user reaches the bottom / taps "Mark as read", fire a single celebratory but calm confirmation (no confetti — Enterprise Calm):

```
┌──────────────────────────────────────────┐
│ ✓ Day 6 complete — 5-day streak 🔥        │  ← bg-success/10, text-success
│ Next question in 14h 22m.                  │
│ [ Back to DSA Lab ]   [ Bonus practice → ]│  bonus = Pro/Sprint, else upgrade
└──────────────────────────────────────────┘
```

Streak increment animates the top-right chip (`animate-scale-in`) and advances today's ribbon dot from `●` to `✓` with a 200ms fill.

---

## 4. Component breakdown

New components live in `apps/web/app/(app)/dsa/_components/` (client where interactive). All compose existing primitives.

| Component | Type | Notes |
|---|---|---|
| `DailyHeroCard` | server shell + client CTA | §2.3. Variants: not_started / in_progress / solved. |
| `StreakRibbon` | server | §2.4. Pure presentation from entitlements. |
| `StreakChip` | client | §2.5. Milestone scale-in. |
| `DailyUtilitiesRow` | client | Skip / Freeze / Recall buttons; each opens a confirm sheet (`animate-slide-up` bottom sheet on mobile, matches `UpgradeModal` chrome). Quota-aware: disabled + upgrade CTA at 0. |
| `ProgressStats` | server | 4× `StatCard` (reuse). tones: current=warning, longest=primary, solved=success, recall=primary. |
| `LockedTeaserCard` | client | Bonus / Company tracks / Interview countdown. Lock glyph + one-line value + tier CTA → `UpgradeModal`. |
| `WhyForYou` | server | personalization strip + optional expandable rationale. |
| `ProgressiveReveal` | client | **extend existing** `reveal.tsx` with `tier`, `entitlements`, and gated stages (see §3). Keep the no-library CSS reveal; add `UpgradeModal` mount. |
| `InlinePaywall` | client | primary-soft card; props `{ trigger, headline, sub, remaining? }`; renders `UpgradeModal` on click. |
| `LangTabs` | client | adds locked-tab state + copy button. |
| `NextRefreshCountdown` | client | `tabular-nums`, updates each minute; `aria-live="polite"`. |
| `RecallDaySheet` | client | quiz-on-past-questions entry (monthly/weekly/daily by tier). |

**Reused as-is:** `SectionCard`, `StatCard`, `UpgradeModal`, `DaysLeftBadge`, `app-shell`, the difficulty/pill helpers (promote the inline `Pill` + `DIFF_CLASS` into a shared `dsa/_components/pills.tsx` to dedupe between index and detail).

---

## 5. State matrix (build & QA checklist)

| State | Index (`/dsa`) | Detail (`/dsa/[slug]`) |
|---|---|---|
| **Empty / pre-launch** | Existing `TransitionPlaceholder` stays as fallback when 0 live questions. | n/a |
| **Day 1 (first-ever)** | Greeting → "Welcome to DSA Lab"; ribbon shows only `●` today; streak chip hidden until first solve; hero CTA "Start your first question"; one-time tooltip on the streak ribbon ("Solve daily to build a streak"). | After solve → onboarding toast: "Day 1 done. Come back tomorrow to keep your streak." |
| **Free · mid-streak** | §2.1 — locked teasers visible, utilities show small quotas. | §3.2/3.3 gates active; approach cap counter visible. |
| **Free · approach cap hit** | hero unchanged | Approach beyond teaser fully paywalled (no credit-spend). |
| **Pro** | Bonus practice **unlocked** (5/day, counter); Company tracks = **Basic (top 5)**; Interview countdown locked (Sprint). | Full approach/steps, all 3 langs, copy on all, AI Coach = weekly-digest note. |
| **Career Sprint** | Bonus **unlimited**; Company tracks **full (30-problem)**; Interview Countdown **unlocked** (date picker → daily plan banner on hero). | + line-by-line annotations toggle; AI Coach inline daily reflection. |
| **Streak milestone (3/5/7/14/30/50/100)** | Chip scale-in + one-time celebratory toast (§6); at 5: contextual nudge "Pro members keep streaks 2.3× longer" → `dsa_streak_milestone`. | Completion footer names the milestone. |
| **Skipped today** | Hero collapses to "Skipped — streak protected. Next question tomorrow." + ribbon dot = `⤼`; utilities show remaining skips. | Direct nav still allowed to read; no streak credit. |
| **Streak frozen** | Ribbon dot = ❄; copy "Freeze used — streak safe." | n/a |
| **Recall day** | Hero swaps to a Recall card ("Today is a Recall day — quiz on 5 past wins"). | Recall quiz view (reuse reveal chrome; multiple-choice, no editor). |
| **Strong role match** | Company track teaser personalizes: "Your resume matches 4 Razorpay roles" → `dsa_company_track`. | "Why for you" names the company + role count. |
| **Offline / load error** | `skeleton` shimmer for hero + ribbon; on error, calm retry card (no stack traces). | same skeleton spine. |

---

## 6. Micro-interactions & animation

All within existing tokens; all reduced-motion safe.

| Moment | Animation | Token |
|---|---|---|
| Page enter (index sections) | staggered rise, 40ms apart | `animate-fade-up` |
| Hero card mount | `animate-scale-in` once | token |
| Reveal stage open | height+opacity expand, ~220ms | existing `reveal.tsx` CSS, ease `0.22,1,0.36,1` |
| Paywall dissolve (credit spent) | blur→sharp + `animate-fade-up` | token |
| Locked lang tab tap | `.press` + brief `ring-1 ring-primary/40`, paywall `animate-fade-up` | tokens |
| Streak dot fill on solve | 200ms scale 0→1 + color → `bg-primary` | inline transition |
| Streak chip milestone | `animate-scale-in` + 2.4s `animate-pulse-soft` halt after 1 cycle | tokens |
| Upgrade modal | bottom-sheet `slide-up` (mobile) / `scale-in` (desktop) | already in `UpgradeModal` |
| Today's countdown | text only, `aria-live="polite"`, no motion | — |
| CTA press | scale .98 | `.press` |
| Card hover (desktop) | `translateY(-1px)` + `elev-2` | `.lift` |

**Never:** confetti, aurora/mesh on app pages, color drifts, parallax. The hero's single `from-primary/12` cap is the only decorative fill; everything else is borders + spacing (Enterprise Calm).

---

## 7. Paywall & upgrade integration

Extend the existing `UpgradeTrigger` union in `components/billing/upgrade-modal.tsx` with DSA-specific copy (matches the brief's moments verbatim). The modal chrome, checkout, and Pro/Sprint cards are reused unchanged.

```ts
// add to UpgradeTrigger:
| "dsa_full_approach" | "dsa_other_langs" | "dsa_skip_exhausted"
| "dsa_streak_milestone" | "dsa_company_track" | "dsa_ai_coach"

// add to TRIGGER_COPY:
dsa_full_approach:  { eyebrow: "Halfway there",        title: "Want the full step-by-step explanation?", body: "Pro is only ₹3.30/day — full approaches, every day." },
dsa_other_langs:    { eyebrow: "One language down",    title: "See it in Java and C++ instantly",          body: "Pro unlocks every solution in all three languages." },
dsa_skip_exhausted: { eyebrow: "Out of skips",         title: "Pro gives you 3 skips a day",               body: "Never break a streak you cared about — upgrade for ₹3/day." },
dsa_streak_milestone:{ eyebrow: "🔥 5-day streak",     title: "Keep it going",                             body: "Pro members keep streaks 2.3× longer on average." },
dsa_company_track:  { eyebrow: "🔥 Strong match",      title: "Unlock the full Razorpay Deep Dive track",  body: "Your resume matches 4 Razorpay roles. Career Sprint opens the curated 30-problem track.", ctaSecondary: { label: "Compare plans", href: "/pricing" } },
dsa_ai_coach:       { eyebrow: "AI Coach",             title: "Daily personalized feedback",               body: "Career Sprint reflects on your solves every day." },
```

Map each UI moment → trigger:

| UI moment (from brief) | Trigger | Surface |
|---|---|---|
| After partial approach (free) | `dsa_full_approach` | inline paywall in Approach |
| After Python solution (free) | `dsa_other_langs` | inline paywall under code |
| Last free skip used | `dsa_skip_exhausted` | Skip confirm sheet |
| 5-day streak reached | `dsa_streak_milestone` | one-time toast CTA |
| Strong role match | `dsa_company_track` | Company tracks teaser |
| AI Coach locked | `dsa_ai_coach` | AI Coach card |

`returnTo` is always the current `/dsa` or `/dsa/[slug]` path so users land back exactly where they were after checkout (the modal already supports this).

---

## 8. Accessibility & quality bar

- **Contrast:** all text uses existing semantic pairs (≥ AA). Difficulty pills carry a text label, never color-only (already true).
- **Locks:** every 🔒 has an `aria-label` ("Locked — upgrade to Pro to view Java"). Paywalls are real focusable buttons, not just decorative overlays.
- **Blurred content** is `aria-hidden` and `select-none` so it neither leaks to AT nor to copy; the real gated strings aren't in the DOM for Free users.
- **Countdown** uses `aria-live="polite"` and `tabular-nums`.
- **Tap targets** ≥44px (`.tap-target`) for all primary actions; secondary ≥36px.
- **Reduced motion** honored globally + per Framer component.
- **Keyboard:** reveal stages, lang tabs, and utility sheets are all keyboard-operable with visible `focus-ring`.

---

## 9. Implementation sequencing (suggested)

1. **Pills/Difficulty** → shared `_components/pills.tsx` (dedupe index + detail).
2. **Entitlements**: `useDsaEntitlements()` + server route reading subscription + streak tables (new `dsa_daily_state`, `dsa_streak`, `dsa_skips` — schema work, idempotent, single `schema.sql` per project rules).
3. **Index redesign**: `DailyHeroCard` + `StreakRibbon` + `ProgressStats` + locked teasers (visual first, entitlements stubbed).
4. **Detail gating**: extend `ProgressiveReveal` with tier + `InlinePaywall` + `LangTabs` locks; ensure server withholds gated strings.
5. **UpgradeModal triggers** (§7) + analytics attribution (the modal already namespaces triggers).
6. **Streak/skip/freeze actions** (server mutations) + completion footer.
7. **Bonus practice, Company tracks, Recall, Interview Countdown** (Pro/Sprint surfaces) — layer last.

Backend tables, the daily-assignment job, and AI-Coach generation are **out of scope for this visual handoff** but the UI contract above (`DsaEntitlements`) is the integration boundary.

---

## 10. One-screen summary for stakeholders

- **`/dsa` becomes a daily ritual**, not a catalog: a personalized hero question, a streak you don't want to break, and visible progress — all in pure white, Inter/Outfit, indigo accent.
- **Depth is the product, gating is the depth**: everyone reads the problem and the *why*; Pro buys the full method + all three languages; Sprint buys coaching, annotations, company tracks, and interview countdown.
- **Every paywall is a natural next step** at the exact moment of intent, reusing the shipped `UpgradeModal` (₹3/day Pro framing) — never a wall in front of value.
- **100% consistent** with ProdMatch.ai: every class, token, and component above already exists in the codebase.
