import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { discussionQuery, repliesQuery } from "@/lib/db";
import { addReply, deleteDiscussion, deleteReply, editReply, saveDiscussion } from "@/lib/forum.functions";
import { useAuth } from "@/hooks/use-auth";
import { relativeTime } from "@/lib/display";
import { UserAvatar } from "@/components/user-avatar";
import { MessageButton } from "@/components/messages/message-button";

export const Route = createFileRoute("/forum/$id")({
  head: () => ({
    meta: [
      { title: "Discussion — Leaderboard forums" },
      {
        name: "description",
        content: "A community discussion among LearnToEarn builders. Read the thread and reply.",
      },
      { property: "og:title", content: "Discussion — Leaderboard forums" },
      {
        property: "og:description",
        content: "A community discussion among LearnToEarn builders.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscussionPage,
});

function DiscussionPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();

  const discussion = useQuery(discussionQuery(id));
  const replies = useQuery(repliesQuery(id));

  const runReply = useServerFn(addReply);
  const runEditReply = useServerFn(editReply);
  const runDeleteReply = useServerFn(deleteReply);
  const runSaveDiscussion = useServerFn(saveDiscussion);
  const runDeleteDiscussion = useServerFn(deleteDiscussion);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicBody, setTopicBody] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["discussion-replies", id] });
    queryClient.invalidateQueries({ queryKey: ["discussion", id] });
    queryClient.invalidateQueries({ queryKey: ["discussions"] });
  }

  const post = useMutation({
    mutationFn: (body: string) => runReply({ data: { discussionId: id, body } as never }),
    onSuccess: () => {
      setDraft("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post your reply"),
  });

  const saveReply = useMutation({
    mutationFn: (vars: { id: string; body: string }) => runEditReply({ data: vars }),
    onSuccess: () => {
      setEditingId(null);
      refresh();
      toast.success("Reply updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your reply"),
  });

  const removeReply = useMutation({
    mutationFn: (replyId: string) => runDeleteReply({ data: { id: replyId } }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete this reply"),
  });

  const saveTopic = useMutation({
    mutationFn: () =>
      runSaveDiscussion({ data: { id, title: topicTitle, body: topicBody } as never }),
    onSuccess: () => {
      setEditingTopic(false);
      refresh();
      toast.success("Discussion updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save this discussion"),
  });

  const removeTopic = useMutation({
    mutationFn: () => runDeleteDiscussion({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      router.navigate({ to: "/forum" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete this discussion"),
  });

  if (discussion.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <SkeletonLines rows={6} />
      </div>
    );
  }
  if (discussion.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <LoadFailure
          message="We couldn't load this discussion just now."
          onRetry={() => discussion.refetch()}
        />
      </div>
    );
  }

  const d = discussion.data;
  if (!d) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Discussion not found</h1>
        <Link to="/forum" className="mt-6 inline-block text-[13px] underline underline-offset-4">
          Back to forums
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(userId) && d.author_id === userId;
  const list = replies.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
      <Link to="/forum" className="font-mono text-[12px] text-muted-foreground hover:text-foreground">
        ← Back to forums
      </Link>

      {editingTopic ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveTopic.mutate();
          }}
          className="mt-6"
        >
          <input
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[15px] outline-none transition-colors duration-200 focus:border-neon"
          />
          <textarea
            value={topicBody}
            onChange={(e) => setTopicBody(e.target.value)}
            rows={5}
            className="mt-3 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saveTopic.isPending}
              className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background disabled:opacity-60"
            >
              {saveTopic.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingTopic(false)}
              className="min-h-11 rounded-full border border-border px-5 text-[13px] transition-colors duration-200 hover:border-neon"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <span className="mt-6 inline-block rounded-full bg-neon-dim px-2.5 py-1 font-mono text-[10px]">
            {d.category}
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{d.title}</h1>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <UserAvatar
              name={d.author?.display_name}
              path={d.author?.avatar_url}
              accent={d.author?.accent_color}
              size={24}
            />
            <span className="truncate">@{d.author?.username ?? "someone"}</span>
            <span aria-hidden>·</span>
            <span>{relativeTime(d.created_at)}</span>
            <MessageButton recipientId={d.author_id} variant="icon" label="Message author" />
          </div>
          <p className="mt-6 whitespace-pre-line text-[14px] leading-relaxed">{d.body}</p>
          {isOwner ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTopicTitle(d.title);
                  setTopicBody(d.body);
                  setEditingTopic(true);
                }}
                className="min-h-10 rounded-full border border-border px-4 text-[12px] transition-colors duration-200 hover:border-neon"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => removeTopic.mutate()}
                className="min-h-10 rounded-full border border-border px-4 text-[12px] text-muted-foreground transition-colors duration-200 hover:border-neon hover:text-foreground"
              >
                Delete
              </button>
            </div>
          ) : null}
        </>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Replies ({list.length})</h2>

        <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
          {replies.isLoading ? (
            <li className="p-4 sm:p-5">
              <SkeletonLines rows={3} />
            </li>
          ) : replies.isError ? (
            <li>
              <LoadFailure
                message="We couldn't load the replies just now."
                onRetry={() => replies.refetch()}
              />
            </li>
          ) : list.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground sm:px-5">
              No replies yet — be the first.
            </li>
          ) : (
            list.map((r) => (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[13px]">
                  <UserAvatar
                    name={r.author?.display_name}
                    path={r.author?.avatar_url}
                    accent={r.author?.accent_color}
                    size={24}
                  />
                  <span className="truncate font-medium">
                    {r.author?.display_name ?? "Someone"}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {relativeTime(r.created_at)}
                  </span>
                </div>
                {editingId === r.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveReply.mutate({ id: r.id, body: editDraft });
                    }}
                    className="mt-2"
                  >
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-neon"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saveReply.isPending}
                        className="min-h-10 rounded-full bg-foreground px-4 text-[12px] font-medium text-background disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-10 rounded-full border border-border px-4 text-[12px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                )}
                {r.author_id === userId && editingId !== r.id ? (
                  <div className="mt-2.5 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(r.id);
                        setEditDraft(r.body);
                      }}
                      className="transition-colors duration-200 hover:text-neon"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReply.mutate(r.id)}
                      className="transition-colors duration-200 hover:text-neon"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {isAuthenticated ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length < 2) return;
              post.mutate(draft.trim());
            }}
            className="mt-6"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Add your reply…"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
            />
            <button
              type="submit"
              disabled={post.isPending}
              className="mt-3 min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
            >
              {post.isPending ? "Posting…" : "Post reply"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-[13px] text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4 hover:text-neon">
              Sign in
            </Link>{" "}
            to reply to this discussion.
          </p>
        )}
      </section>
    </div>
  );
}
