// Sprint 6 — Empty-state discovery card for unused tools.
//
// Shown only when the user has computed matches but hasn't used the Coach /
// Tailored Resume / Negotiation Memo features. Compact, non-pushy — directs
// to the top match's job page where the Apply Toolkit lives.

import Link from "next/link";
import { Sparkles, FileText, MessageSquare, ArrowUpRight } from "lucide-react";

export interface ToolDiscoveryInputs {
  topJobId: string | null;
  topJobTitle: string | null;
  tailoredCount: number;
  memoCount: number;
}

export function ToolDiscoveryCard({ inputs }: { inputs: ToolDiscoveryInputs }) {
  // Coach is a runtime Q&A (no persisted artifact). We always surface it
  // as a discovery prompt; the user can dismiss the section if it's
  // irrelevant. Tailored Resume and Memo are persisted, so we hide them
  // once used.
  const tools = [
    { used: false,                    icon: Sparkles,     name: "AI Coach",        desc: "Career questions, answered with your resume context.", href: "/coach" },
    { used: inputs.tailoredCount > 0, icon: FileText,     name: "Tailored Resume", desc: "JD-anchored .docx in one click.",                      href: inputs.topJobId ? `/jobs/${inputs.topJobId}#apply-toolkit` : "/matches" },
    { used: inputs.memoCount > 0,     icon: MessageSquare, name: "Negotiation Memo", desc: "Market-grounded ask + counter-offer prep.",          href: inputs.topJobId ? `/jobs/${inputs.topJobId}#apply-toolkit` : "/matches" },
  ];
  const unused = tools.filter((t) => !t.used);
  if (unused.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold">Tools you haven&apos;t tried yet</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {inputs.topJobTitle
            ? `Try one on your top match: ${inputs.topJobTitle}`
            : "Powered by Gemini, grounded in your resume + the live JD."}
        </p>
      </header>
      <ul className="space-y-2">
        {unused.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.name}>
              <Link
                href={t.href}
                className="group flex items-start gap-3 rounded-md px-2 py-2 -mx-2 transition hover:bg-secondary/40 focus-ring"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t.desc}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
