import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Target } from "lucide-react";
import { toast } from "sonner";
import { SkeletonLines } from "@/components/skeleton-block";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { discussionsQuery } from "@/lib/db";
import { saveDiscussion } from "@/lib/forum.functions";
import { questsQuery } from "@/lib/quests";

const FIELD =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors duration-200 focus:border-neon";

/** Turns bare links in a post into real links, nothing more. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all text-neon underline underline-offset-4"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/**
 * The community feed: short updates, shared links and quest talk. Posts reuse
 * the existing discussion system, so every post has a thread for comments.
 */
export function CommunityFeed() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const feed = useQuery(discussionsQuery());
  const quests = useQuery(questsQuery());
  const run = useServerFn(saveDiscussion);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [questId, setQuestId] = useState("");

  const post = useMutation({
    mutationFn: () =>
      run({
        data: {
          title: title.trim(),
          body: body.trim(),
          category: "Updates",
          questId: questId || null,
        } as never,
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setQuestId("");
      setOpen(false);
      toast.success("Posted to the community feed");
      void queryClient.invalidateQueries({ queryKey: ["discussions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post that update"),
  });

  const posts = (feed.data ?? []).slice(0, 12);
  const openQuests = (quests.data ?? []).filter(
    (q) => !q.closed_at && new Date(q.ends_at) > new Date(),
  );

  return (
    <section aria-label="Community feed">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Community feed</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Share an update, drop a link, or talk through a quest.
          </p>
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="min-h-10 rounded-full bg-foreground px-4 text-[12px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            {open ? "Close" : "Post update"}
          </button>
        ) : (
          <Link
            to="/auth"
            className="glass-pill min-h-10 px-4 py-2 text-[12px] transition-colors duration-200 hover:text-neon"
          >
            Sign in to post
          </Link>
        )}
      </div>

      {open && isAuthenticated ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 4 || body.trim().length < 10) {
              toast.error("Add a short title and a little more detail");
              return;
            }
            post.mutate();
          }}
          className="surface-card mt-5 p-4 sm:p-5"
        >
          <label className="block text-[12px] text-on-dark-muted">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shipped the first version of…"
              className={FIELD}
            />
          </label>
          <label className="mt-4 block text-[12px] text-on-dark-muted">
            Update
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What you built, what you learned, a link to try it…"
              className={FIELD}
            />
          </label>
          {openQuests.length > 0 ? (
            <label className="mt-4 block text-[12px] text-on-dark-muted">
              About a quest (optional)
              <select
                value={questId}
                onChange={(e) => setQuestId(e.target.value)}
                className={FIELD}
              >
                <option value="">No quest</option>
                {openQuests.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="submit"
            disabled={post.isPending}
            className="mt-5 min-h-11 rounded-full bg-neon px-5 text-[13px] font-semibold text-background transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
          >
            {post.isPending ? "Posting…" : "Post to feed"}
          </button>
        </form>
      ) : null}

      {feed.isLoading && posts.length === 0 ? (
        <SkeletonLines rows={4} className="mt-5 p-4" />
      ) : feed.isError ? (
        <p className="mt-5 text-[13px] text-muted-foreground">
          The feed couldn&apos;t load right now — the rest of the page still works.
        </p>
      ) : posts.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted-foreground">
          Nothing posted yet. Be the first to share what you&apos;re building.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <UserAvatar
                  name={p.author?.display_name ?? "Builder"}
                  path={p.author?.avatar_url ?? null}
                  accent={p.author?.accent_color ?? undefined}
                  size={26}
                />
                <span className="text-[13px] font-medium text-on-dark">
                  {p.author?.display_name ?? "Builder"}
                </span>
                <span className="glass-pill-dark px-2.5 py-1 font-mono text-[10px] text-on-dark">
                  {p.category}
                </span>
                {p.quest_title ? (
                  <span className="glass-pill-dark flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] text-on-dark">
                    <Target className="size-3 text-neon" /> {p.quest_title}
                  </span>
                ) : null}
                <span className="font-mono text-[10px] text-on-dark-muted">
                  {new Date(p.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold tracking-tight text-on-dark">
                {p.title}
              </h3>
              <Body text={p.body.length > 400 ? `${p.body.slice(0, 400)}…` : p.body} />
              <Link
                to="/forum/$id"
                params={{ id: p.id }}
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-on-dark-muted transition-colors duration-200 hover:text-neon"
              >
                <MessageSquare className="size-3.5" />
                {p.reply_count === 1 ? "1 comment" : `${p.reply_count ?? 0} comments`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
