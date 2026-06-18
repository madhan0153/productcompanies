"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";
import { use, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "./actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clientEnv } from "@/lib/env";
import { oauthCallbackUrl, safeInternalPath } from "@/lib/auth/redirect";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

type Props = {
  searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string }>;
};

export function LoginForm({ searchParams }: Props) {
  const params = use(searchParams);
  const [emailPending, startEmail] = useTransition();
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setGoogleError("Could not complete sign in. Please request a new link.");
          return;
        }
        router.replace(safeInternalPath(params.next));
      });

    return () => {
      cancelled = true;
    };
  }, [params.next, router]);

  const card = {
    initial: reduce ? {} : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  };

  async function handleGoogle() {
    setGooglePending(true);
    setGoogleError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const callback = oauthCallbackUrl(
        window.location.origin,
        clientEnv.NEXT_PUBLIC_APP_URL,
        params.next,
      );
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setGoogleError(error.message);
        setGooglePending(false);
        return;
      }
      if (!data.url) {
        setGoogleError("Google sign-in could not be started. Please try again.");
        setGooglePending(false);
        return;
      }
      // Keep OAuth in the current top-level tab so mobile browsers retain the
      // phone user agent instead of opening a popup/webview with desktop layout.
      window.location.assign(data.url);
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : "Google sign-in failed");
      setGooglePending(false);
    }
  }

  if (params.sent) {
    return (
      <motion.div {...card} className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a magic link to <strong>{params.email}</strong>.<br />
          Click it to sign in — no password needed.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Didn&apos;t receive it? Check spam or try again.</p>
      </motion.div>
    );
  }

  const errorMessage = googleError ?? (params.error ? decodeURIComponent(params.error) : null);

  return (
    <motion.div {...card} className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur">
      <h1 className="text-xl font-semibold">Sign in to ProdMatch.ai</h1>
      <p className="mt-1 text-sm text-muted-foreground">We&apos;ll send a magic link to your email.</p>

      {errorMessage && (
        <div role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form action={signInWithEmail} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Work or personal email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={emailPending}
          onClick={() => startEmail(() => {})}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {emailPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {emailPending ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googlePending}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-secondary active:scale-[0.98] disabled:opacity-60"
      >
        {googlePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {googlePending ? "Redirecting to Google…" : "Continue with Google"}
      </button>
    </motion.div>
  );
}
