"use client";

import { useState, useId } from "react";
import { Plus, X, Pencil, Loader2 } from "lucide-react";
import { upsertStory } from "./actions";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Story = {
  id: string;
  title: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  tags: string[] | null;
};

function StoryForm({
  story,
  onClose,
}: {
  story?: Story;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const titleId = useId();

  useEscapeKey(onClose);
  const trapRef = useFocusTrap(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await upsertStory(fd);
    setPending(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 id={titleId} className="font-semibold">
            {story ? "Edit story" : "New story"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {story && <input type="hidden" name="id" value={story.id} />}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <input
              name="title"
              required
              defaultValue={story?.title}
              placeholder="e.g. Led 0→1 payments feature at Razorpay"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {(["situation", "task", "action", "result"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-medium">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary" aria-hidden="true">
                  {field[0].toUpperCase()}
                </span>
                <span className="text-muted-foreground capitalize">{field}</span>
              </label>
              <textarea
                name={field}
                rows={3}
                defaultValue={story?.[field] ?? ""}
                placeholder={PLACEHOLDERS[field]}
                aria-label={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tags (comma-separated)
            </label>
            <input
              name="tags"
              defaultValue={story?.tags?.join(", ") ?? ""}
              placeholder="leadership, product-sense, data-driven"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {story ? "Save changes" : "Create story"}
          </button>
        </form>
      </div>
    </div>
  );
}

const PLACEHOLDERS = {
  situation: "Describe the context and background…",
  task: "What was your specific responsibility or challenge?",
  action: "What steps did you take? Focus on YOUR actions.",
  result: "What was the measurable outcome? Include numbers if possible.",
};

export function NewStoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> New story
      </button>
      {open && <StoryForm onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditStoryButton({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Edit story: ${story.title}`}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
      </button>
      {open && <StoryForm story={story} onClose={() => setOpen(false)} />}
    </>
  );
}
