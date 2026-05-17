import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Unified panel chrome — every "card with a header and a body" surface in the
 * app uses this shape. Solid bg-card, restrained border, header strip with
 * optional action link, optional micro-footnote at the bottom.
 *
 * Designed mobile-first: header collapses to two lines on tight widths
 * (title above subtitle), action shrinks to icon-only.
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  actionHref,
  actionLabel,
  footer,
  badge,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  footer?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{title}</h2>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition hover:text-primary focus-ring"
          >
            <span className="hidden sm:inline">{actionLabel}</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      {children}
      {footer && (
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
          {footer}
        </p>
      )}
    </section>
  );
}

/** A simple stat card matched to the SectionCard aesthetic. */
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "primary",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "primary" | "success" | "warning" | "destructive";
  href?: string;
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary-soft-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];

  const Wrap = href
    ? ({ children }: { children: React.ReactNode }) => (
        <Link
          href={href}
          className="group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring sm:p-5"
        >
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-col rounded-xl border border-border bg-card p-4 sm:p-5">{children}</div>
      );

  return (
    <Wrap>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Wrap>
  );
}
