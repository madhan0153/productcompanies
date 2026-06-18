"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
  read_at: string | null;
};

type FeedResponse = {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const POLL_MS = 60_000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as FeedResponse;
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
      setError(null);
    } catch {
      setError("Notifications are temporarily unavailable.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?before=${encodeURIComponent(nextCursor)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as FeedResponse;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(data.items ?? []).filter((item) => !seen.has(item.id))];
      });
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
      setError(null);
    } catch {
      setError("Could not load older notifications.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (item.read_at ? item : { ...item, read_at: now })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      void refresh();
    }
  }, [refresh]);

  const markOneRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    let wasUnread = false;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (!item.read_at) wasUnread = true;
        return item.read_at ? item : { ...item, read_at: now };
      }),
    );
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        items,
        unreadCount,
        loading,
        loadingMore,
        error,
        hasMore,
        refresh,
        loadMore,
        markAllRead,
        markOneRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
