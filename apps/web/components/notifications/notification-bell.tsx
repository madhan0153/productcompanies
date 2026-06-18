"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, BellRing, Briefcase, CheckCheck, ClipboardList, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useNotifications, type NotificationItem } from "./notifications-provider";

type Placement = "header" | "sidebar";

const TYPE_ICON: Record<string, typeof Bell> = {
  new_matches: Sparkles,
  application_reminders: ClipboardList,
  job_alerts: Briefcase,
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ placement }: { placement: Placement }) {
  const { items, unreadCount, loading, markAllRead, markOneRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setOpen(false));

  // Click-away close.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleOpen(item: NotificationItem) {
    void markOneRead(item.id);
    setOpen(false);
    if (item.url) router.push(item.url);
  }

  const hasUnread = unreadCount > 0;
  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  // Fixed positioning (not absolute) so the panel never gets clipped or painted
  // under the static desktop sidebar / main content. Header bell = mobile/tablet
  // top-right; sidebar bell = desktop, anchored just right of the 16rem sidebar.
  const panelPosition =
    placement === "header"
      ? "fixed left-3 right-3 top-[3.75rem] mx-auto max-w-md sm:left-auto sm:right-3 sm:w-[22rem]"
      : "fixed left-[16.5rem] top-3 w-[20rem]";

  return (
    <div ref={wrapRef} className="inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={cn(
          "relative inline-flex items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring",
          placement === "header" ? "p-2 tap-target-sm" : "h-9 w-9",
        )}
      >
        {hasUnread ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        {hasUnread && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[1.05rem] text-primary-foreground ring-2 ring-background"
          >
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile dimming backdrop — desktop relies on click-away. */}
            <motion.div
              className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={reduce ? false : { opacity: 0, y: placement === "header" ? -8 : 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: placement === "header" ? -8 : 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "z-50 flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
                panelPosition,
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  {hasUnread && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground focus-ring"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {loading && items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">Loading…</div>
                ) : items.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {items.map((item) => {
                      const Icon = TYPE_ICON[item.type] ?? Bell;
                      const unread = !item.read_at;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleOpen(item)}
                            className={cn(
                              "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/50 focus-ring",
                              unread && "bg-primary/[0.04]",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                unread ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                              </span>
                              {item.body && (
                                <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                                  {item.body}
                                </span>
                              )}
                              <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                                {timeAgo(item.created_at)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Bell className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">You&apos;re all caught up</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        New matches, reminders, and job alerts will show up here.
      </p>
    </div>
  );
}
