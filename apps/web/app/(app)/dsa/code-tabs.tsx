"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  DSA_CODE_LANG_LABEL,
  DSA_CODE_LANGS,
  type DsaCodeLang,
  type DsaLearningGuide,
} from "@prodmatch/shared";
import { cn } from "@/lib/utils";

/**
 * Multi-language code tabs for canonical solutions.
 *
 * Falls back to single-language rendering if codeByLang is missing — keeps
 * the older problems that only ship TypeScript working without a rewrite.
 */
export function CodeTabs({ guide }: { guide: DsaLearningGuide }) {
  const available = DSA_CODE_LANGS.filter((lang) => Boolean(guide.codeByLang?.[lang]));
  const initial = available[0] ?? "typescript";
  const [lang, setLang] = useState<DsaCodeLang>(initial);
  const [copied, setCopied] = useState(false);

  const code = guide.codeByLang?.[lang] ?? guide.code;
  if (!code) return null;

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard rejected — keep UI quiet */
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Solution language">
          {available.length > 0 ? (
            available.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={option === lang}
                onClick={() => setLang(option)}
                className={cn(
                  "min-h-9 shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition",
                  option === lang
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {DSA_CODE_LANG_LABEL[option]}
              </button>
            ))
          ) : (
            <span className="px-2 text-[11px] font-medium text-muted-foreground">TypeScript</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
