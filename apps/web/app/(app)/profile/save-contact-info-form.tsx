"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { saveContactInfo } from "./actions";

type Props = {
  email: string;
  defaultValues: { phone: string; linkedin_url: string; github_url: string };
};

export function SaveContactInfoForm({ email, defaultValues }: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveContactInfo(fd);
      if (result.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        These appear on your tailored resume. Never sent to AI models.
      </p>

      {/* Email — read-only from auth */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Email</label>
        <input
          type="text"
          value={email}
          disabled
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="phone" className="text-xs font-medium text-foreground">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
            placeholder="+91 98765 43210"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="linkedin_url" className="text-xs font-medium text-foreground">LinkedIn URL</label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            defaultValue={defaultValues.linkedin_url}
            placeholder="https://linkedin.com/in/yourname"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="github_url" className="text-xs font-medium text-foreground">GitHub URL</label>
        <input
          id="github_url"
          name="github_url"
          type="url"
          defaultValue={defaultValues.github_url}
          placeholder="https://github.com/yourhandle"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save contact info"}
        </button>
        {saved && <span className="text-xs text-success font-medium">Saved</span>}
      </div>
    </form>
  );
}
