import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";

export function EditorialTrustPanel({
  updatedAt,
  reviewer = "ProdMatch Editorial",
}: {
  updatedAt: string;
  reviewer?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Editorial review standard</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Reviewed by {reviewer}. ProdMatch uses official career pages,
            public company information, and live crawler audit data; we avoid
            aggregator listings and do not sell candidate data.
          </p>
          <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <span>Last material update: {formatDate(updatedAt)}</span>
            <span>/</span>
            <Link href="/about" className="font-medium text-primary hover:underline">
              About ProdMatch credentials
            </Link>
          </p>
        </div>
      </div>
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
