"use client";

// Mobile-first cheatsheet picker + viewer.
//
// Two-pane UX:
//   1. Picker — pill grid of approved companies × 5 round types.
//      A previously-generated row shows a green dot so the user knows
//      they have a cached cheatsheet for that combination.
//   2. Viewer — once selected, fetches (cached if available) and
//      renders the markdown.

import { useState, useTransition } from "react";
import {
  Loader2, Sparkles, AlertTriangle, CheckCircle2, ChevronLeft,
  ExternalLink, FileText,
} from "lucide-react";
import { fetchOrGenerateCheatsheetAction, CHEATSHEET_ROUND_DISPLAY } from "../phase3-actions";
import { CRAWLER_META, type CrawlerMeta } from "@prodmatch/shared";
import type { CheatsheetRound } from "@/lib/llm/prompts/interview-cheatsheet";

export interface ExistingCheatsheet {
  company_slug: string;
  role_function: string;
  round_type: string;
  title: string;
  updated_at: string;
}

const ROUNDS: CheatsheetRound[] = ["phone_screen", "dsa", "system_design", "behavioral", "hiring_manager"];

interface Selection {
  company_slug: string;
  round_type: CheatsheetRound;
}

export function CheatsheetClient({ existing }: { existing: ExistingCheatsheet[] }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [body, setBody] = useState<{ title: string; body_markdown: string; from_cache: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const existingKey = (c: string, r: string) => `${c}|${r}`;
  const existingSet = new Set(existing.map((e) => existingKey(e.company_slug, e.round_type)));

  function handleSelect(company_slug: string, round_type: CheatsheetRound) {
    setSelection({ company_slug, round_type });
    setBody(null);
    setFlash(null);
    startTransition(async () => {
      const res = await fetchOrGenerateCheatsheetAction({ company_slug, round_type });
      if (res.ok && res.data) {
        setBody(res.data);
      } else {
        setFlash(res.error ?? "Could not fetch cheatsheet.");
      }
    });
  }

  if (selection) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => { setSelection(null); setBody(null); }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Pick another company × round
        </button>

        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {selection.company_slug} · {CHEATSHEET_ROUND_DISPLAY[selection.round_type]}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            {body?.title || (pending ? "Generating…" : "Cheatsheet")}
          </h2>
        </header>

        {flash && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />{flash}
            </span>
          </div>
        )}

        {pending && !body && (
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              Building your cheatsheet… up to 15 seconds.
            </p>
          </div>
        )}

        {body && (
          <article className="rounded-2xl border border-border bg-card/40 p-4">
            {body.from_cache && (
              <p className="mb-2 text-[10px] text-muted-foreground">
                Cached version. Re-upload your resume to refresh.
              </p>
            )}
            <MarkdownBody source={body.body_markdown} />
          </article>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Pick a company and a round to generate a one-page cheatsheet. Saved per (company, round) — re-opening is instant.
      </p>
      <div className="space-y-2">
        {(CRAWLER_META as readonly CrawlerMeta[]).map((c) => (
          <section key={c.slug} className="rounded-2xl border border-border bg-card/40 p-3">
            <p className="text-sm font-semibold">{c.name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ROUNDS.map((r) => {
                const has = existingSet.has(existingKey(c.slug, r));
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelect(c.slug, r)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
                      has
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/50"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {has ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {CHEATSHEET_ROUND_DISPLAY[r]}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Markdown rendering (tiny safe renderer for our 5-section format) ─────

function MarkdownBody({ source }: { source: string }) {
  // We control the prompt that produces this markdown, but render it safely
  // anyway. Supports: h2 (##), bullets (-, •), bold (**…**), inline code (`…`).
  // No raw HTML. Lines starting with text are rendered as paragraphs.
  const lines = source.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let key = 0;
  let bulletBuffer: string[] = [];
  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`} className="my-2 space-y-1">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(b)}</li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) { flushBullets(); continue; }
    if (line.startsWith("## ")) {
      flushBullets();
      out.push(
        <h3 key={`h-${key++}`} className="mt-3 mb-1 text-sm font-semibold uppercase tracking-wider text-primary">
          {line.slice(3).trim()}
        </h3>,
      );
      continue;
    }
    if (/^(?:-|•|\*) /.test(line)) {
      bulletBuffer.push(line.replace(/^(?:-|•|\*) /, ""));
      continue;
    }
    flushBullets();
    out.push(<p key={`p-${key++}`} className="my-1 text-sm leading-relaxed">{renderInline(line)}</p>);
  }
  flushBullets();
  return <div>{out}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  // Parse `code` and **bold** without recursion. Pure text otherwise.
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let key = 0;
  while (i < text.length) {
    if (text[i] === "`") {
      if (buf) { out.push(buf); buf = ""; }
      const close = text.indexOf("`", i + 1);
      if (close > i) {
        out.push(<code key={`c-${key++}`} className="rounded bg-background/60 px-1 py-0.5 text-[12px]">{text.slice(i + 1, close)}</code>);
        i = close + 1;
        continue;
      }
    }
    if (text[i] === "*" && text[i + 1] === "*") {
      const close = text.indexOf("**", i + 2);
      if (close > i) {
        if (buf) { out.push(buf); buf = ""; }
        out.push(<strong key={`b-${key++}`}>{text.slice(i + 2, close)}</strong>);
        i = close + 2;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  if (buf) out.push(buf);
  return out;
}

// Stub icons used implicitly elsewhere — kept for future expansion.
void FileText;
void ExternalLink;
