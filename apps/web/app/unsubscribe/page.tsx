import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCronSecret } from "@/lib/security/cron";

export const metadata: Metadata = { title: "Unsubscribe — ProdMatch.ai" };

function verifyToken(uid: string, token: string): boolean {
  let secret: string;
  try {
    secret = requireCronSecret();
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(uid).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string }>;
}) {
  const params = await searchParams;
  const { uid, token } = params;

  if (!uid || !token || !verifyToken(uid, token)) {
    return (
      <UnsubscribeLayout>
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This unsubscribe link is invalid or has expired. Please manage your
          email preferences in your{" "}
          <Link href="/settings/privacy" className="text-primary underline-offset-2 hover:underline">
            Privacy settings
          </Link>
          .
        </p>
      </UnsubscribeLayout>
    );
  }

  // Update digest subscription to 'off'
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("digest_subscriptions")
    .update({ frequency: "off", next_send_at: null })
    .eq("user_id", uid);

  if (error) {
    return (
      <UnsubscribeLayout>
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t process your unsubscribe request. Please try again
          or manage preferences in your{" "}
          <Link href="/settings/privacy" className="text-primary underline-offset-2 hover:underline">
            Privacy settings
          </Link>
          .
        </p>
      </UnsubscribeLayout>
    );
  }

  return (
    <UnsubscribeLayout>
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
      <h1 className="mt-4 text-xl font-semibold">Unsubscribed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ve been removed from the weekly match digest. You won&apos;t
        receive any more digest emails.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Changed your mind?{" "}
        <Link href="/settings/privacy" className="text-primary underline-offset-2 hover:underline">
          Re-enable digest
        </Link>{" "}
        from privacy settings.
      </p>
    </UnsubscribeLayout>
  );
}

function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-elev2">
        <div className="brand-mark mb-4 text-lg">ProdMatch</div>
        {children}
        <p className="mt-6 text-xs text-muted-foreground">
          DPDP Act 2023 · Your consent to email digests has been withdrawn.
        </p>
      </div>
    </div>
  );
}
