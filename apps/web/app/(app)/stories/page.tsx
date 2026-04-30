import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewStoryButton, EditStoryButton } from "./story-dialog";
import { deleteStory } from "./actions";

export const metadata: Metadata = { title: "Story Bank" };

type Story = {
  id: string;
  title: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

const STAR_FIELDS = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
] as const;

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const activeTag = params.tag ?? null;

  const { data } = await supabase
    .from("stories")
    .select("id, title, situation, task, action, result, tags, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const stories = (data ?? []) as Story[];

  const allTags = [...new Set(stories.flatMap((s) => s.tags ?? []))].sort();
  const filtered = activeTag
    ? stories.filter((s) => s.tags?.includes(activeTag))
    : stories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Story Bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stories.length > 0
              ? `${stories.length} STAR ${stories.length === 1 ? "story" : "stories"} · ready for interviews`
              : "Build your library of STAR interview stories"}
          </p>
        </div>
        <NewStoryButton />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/stories"
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
              !activeTag
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            ].join(" ")}
          >
            All ({stories.length})
          </Link>
          {allTags.map((tag) => {
            const count = stories.filter((s) => s.tags?.includes(tag)).length;
            return (
              <Link
                key={tag}
                href={`/stories?tag=${encodeURIComponent(tag)}`}
                className={[
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  activeTag === tag
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                ].join(" ")}
              >
                <Tag className="h-3 w-3" /> {tag} ({count})
              </Link>
            );
          })}
        </div>
      )}

      {/* Stories grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {activeTag
              ? `No stories tagged "${activeTag}" yet.`
              : `No stories yet — click "New story" to add your first STAR story.`}
          </p>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }: { story: Story }) {
  const filledFields = STAR_FIELDS.filter((f) => story[f.key]);
  const completeness = Math.round((filledFields.length / 4) * 100);

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card/40 p-5 transition hover:border-primary/30 hover:bg-card/60">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">{story.title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <EditStoryButton story={story} />
          <form action={deleteStory}>
            <input type="hidden" name="id" value={story.id} />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg border border-transparent p-1.5 text-muted-foreground opacity-0 transition hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* STAR fields preview */}
      <div className="mt-3 flex-1 space-y-2">
        {STAR_FIELDS.map(({ key, label }) => (
          story[key] ? (
            <div key={key} className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">{label}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{story[key]}</p>
            </div>
          ) : (
            <div key={key} className="flex items-center gap-2 opacity-40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <span className="text-xs text-muted-foreground italic">not filled</span>
            </div>
          )
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {(story.tags ?? []).slice(0, 4).map((tag) => (
            <Link
              key={tag}
              href={`/stories?tag=${encodeURIComponent(tag)}`}
              className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              {tag}
            </Link>
          ))}
        </div>
        {/* Completeness */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${completeness === 100 ? "bg-emerald-400" : completeness >= 50 ? "bg-amber-400" : "bg-muted-foreground/40"}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <span className="tabular-nums">{completeness}%</span>
        </div>
      </div>
    </div>
  );
}
