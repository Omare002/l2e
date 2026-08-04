import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/section-heading";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { discussionsQuery } from "@/lib/db";
import { saveDiscussion } from "@/lib/forum.functions";
import { DISCUSSION_CATEGORIES } from "@/lib/validation";
import { useAuth } from "@/hooks/use-auth";
import { initialsOf, relativeTime } from "@/lib/display";

export const Route = createFileRoute("/forum/")({
  head: () => ({
    meta: [
      { title: "Community forums — Leaderboard" },
      {
        name: "description",
        content:
          "Ask questions, share what you learned, and help other LearnToEarn builders in the community forums.",
      },
      { property: "og:title", content: "Community forums — Leaderboard" },
      {
        property: "og:description",
        content: "Ask questions, share progress, and help other LearnToEarn builders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForumIndex,
});

function ForumIndex() {
  const { data, isLoading, isError, refetch } = useQuery(discussionsQuery());
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const runSave = useServerFn(saveDiscussion);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("General");

  const create = useMutation({
    mutationFn: () => runSave({ data: { title, body, category } as never }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Discussion posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post your discussion"),
  });

  const discussions = data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Forums</h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Ask questions, share what you learned, and help other builders. Newest activity first.
      </p>

      <div className="mt-8">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="min-h-12 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            {open ? "Cancel" : "Start a discussion"}
          </button>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4 hover:text-neon">
              Sign in
            </Link>{" "}
            to start a discussion or reply.
          </p>
        )}

        {open && isAuthenticated ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 4 || body.trim().length < 10) {
                toast.info("Add a title and a little more detail");
                return;
              }
              create.mutate();
            }}
            className="mt-5 rounded-lg border border-border p-4 sm:p-5"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
            />
            <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {DISCUSSION_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`min-h-9 shrink-0 rounded-full border px-3.5 text-[12px] transition-colors duration-200 ${
                    category === c ? "border-neon bg-neon-dim" : "border-border hover:border-neon"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Share the details…"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
            />
            <button
              type="submit"
              disabled={create.isPending}
              className="mt-3 min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
            >
              {create.isPending ? "Posting…" : "Post discussion"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-12">
        <SectionHeading title="Discussions" subtitle="Most recently active first." />
        <div className="overflow-hidden rounded-lg border border-border">
          {isLoading ? (
            <SkeletonLines rows={5} className="p-4 sm:p-5" />
          ) : isError ? (
            <LoadFailure message="We couldn't load the forum just now." onRetry={() => refetch()} />
          ) : discussions.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground sm:px-6">
              No discussions yet — start the first one.
            </p>
          ) : (
            discussions.map((d) => (
              <Link
                key={d.id}
                to="/forum/$id"
                params={{ id: d.id }}
                className="block border-b border-border px-4 py-4 transition-colors duration-200 last:border-b-0 hover:bg-muted/50 sm:px-5"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-medium">{d.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                      {d.body}
                    </p>
                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-ink"
                        style={{ background: d.author?.accent_color ?? "var(--neon)" }}
                      >
                        {initialsOf(d.author?.display_name)}
                      </span>
                      <span className="truncate">@{d.author?.username ?? "someone"}</span>
                      <span aria-hidden>·</span>
                      <span>{d.category}</span>
                      <span aria-hidden>·</span>
                      <span>{relativeTime(d.last_activity_at)}</span>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                    <MessageSquare className="size-3.5" /> {d.reply_count ?? 0}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
