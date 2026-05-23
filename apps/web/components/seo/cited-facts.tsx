import { ExternalLink } from "lucide-react";

export interface CitedFact {
  label: string;
  value: string;
  sourceLabel: string;
  sourceHref?: string | null;
}

export function CitedFacts({
  title = "Cited facts",
  updatedAt,
  facts,
}: {
  title?: string;
  updatedAt: string;
  facts: CitedFact[];
}) {
  return (
    <section className="border-y border-border py-5 sm:py-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-[11px] text-muted-foreground">
          Updated {formatDate(updatedAt)}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-border/70 bg-background px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-relaxed">{fact.value}</dd>
            <dd className="mt-1 text-[11px] text-muted-foreground">
              Source:{" "}
              {fact.sourceHref ? (
                <a
                  href={fact.sourceHref}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {fact.sourceLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span>{fact.sourceLabel}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
