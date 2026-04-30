"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Derive the canonical origin from the incoming request so callbacks always
// match the actual deployment (works for production + Vercel previews + local).
async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/login?sent=1&email=${encodeURIComponent(email)}`);
}
