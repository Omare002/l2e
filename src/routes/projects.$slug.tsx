import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronUp, ExternalLink, Github } from "lucide-react";
import { toast } from "sonner";
import { commentsQuery, projectQuery } from "@/lib/db";
import { addComment, deleteComment, editComment } from "@/lib/app.functions";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { useVote } from "@/hooks/use-vote";
import { useAuth } from "@/hooks/use-auth";
import { useStoredImage } from "@/lib/media";
import { relativeTime } from "@/lib/display";
import { UserAvatar } from "@/components/user-avatar";
import { MessageButton } from "@/components/messages/message-button";
import { statusLabel } from "@/data/community";

export const Route = createFileRoute("/projects/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Leaderboard` },
      { name: "description", content: "A project shipped by a LearnToEarn builder. Vote and leave feedback." },
      { property: "og:title", content: `${params.slug} — Leaderboard` },
      {
        property: "og:description",
        content: "A project shipped by a LearnToEarn builder. Vote and leave feedback.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const { data: project, isLoading } = useQuery(projectQuery(slug));
  const commentsResult = useQuery(commentsQuery(project?.id ?? undefined));
  const comments = commentsResult.data;
  const { hasVoted, vote, isPending, isOwn } = useVote();
  const { isAuthenticated, userId } = useAuth();
  const queryClient = useQueryClient();
  const runComment = useServerFn(addComment);
  const runEditComment = useServerFn(editComment);
  const runDeleteComment = useServerFn(deleteComment);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const thumb = useStoredImage("thumbnails", project?.thumbnail_url);

  function refreshComments() {
    queryClient.invalidateQueries({ queryKey: ["comments"] });
    queryClient.invalidateQueries({ queryKey: ["project"] });
  }

  const post = useMutation({
    mutationFn: (body: string) =>
      runComment({ data: { projectId: project!.id!, body, kind: "feedback" } as never }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.success("Feedback posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post feedback"),
  });

  const saveEdit = useMutation({
    mutationFn: (vars: { id: string; body: string }) => runEditComment({ data: vars }),
    onSuccess: () => {
      setEditingId(null);
      refreshComments();
      toast.success("Feedback updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your feedback"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => runDeleteComment({ data: { id } }),
    onSuccess: () => refreshComments(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete this feedback"),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-[13px] text-muted-foreground sm:px-6">Loading project…</div>;
  }
  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Project not found</h1>
        <Link to="/projects" className="mt-6 inline-block text-[13px] underline underline-offset-4">
          Back to projects
        </Link>
      </div>
    );
  }

  const voted = hasVoted(project.id!);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
      <Link to="/projects" className="font-mono text-[12px] text-muted-foreground hover:text-foreground">
        ← Back to projects
      </Link>

      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <span className="rounded-full bg-neon-dim px-2.5 py-1 font-mono text-[10px]">
            {project.category} · {statusLabel(project.status ?? "shipped")}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {project.tagline}
          </p>
          <Link
            to="/builders/$username"
            params={{ username: project.owner_username ?? "" }}
            className="mt-4 inline-flex items-center gap-2.5 text-[13px] transition-colors duration-200 hover:text-neon"
          >
            <UserAvatar
              name={project.owner_display_name}
              path={project.owner_avatar_url}
              accent={project.owner_accent_color}
              size={28}
              eager
            />
            {project.owner_display_name} · @{project.owner_username}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => vote(project.id!, project.owner_id!)}
          disabled={isPending(project.id!) || isOwn(project.owner_id!)}
          aria-pressed={voted}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 font-mono text-[13px] tabular-nums transition-colors duration-200 disabled:opacity-60 ${
            voted ? "border-neon bg-neon/10 text-neon" : "border-border hover:border-neon"
          }`}
        >
          <ChevronUp className="size-4" /> {project.vote_count ?? 0}
        </button>
      </div>

      {thumb ? (
        <img
          src={thumb}
          alt={`${project.title} preview`}
          className="mt-8 aspect-[16/7] w-full rounded-lg object-cover"
        />
      ) : null}

      <p className="mt-8 max-w-3xl whitespace-pre-line text-[14px] leading-relaxed">
        {project.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(project.tech ?? []).map((t) => (
          <span key={t} className="rounded-full border border-border px-3 py-1.5 font-mono text-[11px]">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {project.demo_url ? (
          <a
            href={project.demo_url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-[13px] transition-colors duration-200 hover:border-neon"
          >
            <ExternalLink className="size-3.5" /> Live demo
          </a>
        ) : null}
        {project.github_url ? (
          <a
            href={project.github_url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-[13px] transition-colors duration-200 hover:border-neon"
          >
            <Github className="size-3.5" /> Source
          </a>
        ) : null}
        <MessageButton recipientId={project.owner_id} projectId={project.id} />
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">
          Feedback ({project.comment_count ?? 0})
        </h2>

        {isAuthenticated ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length < 2) return;
              post.mutate(draft.trim());
            }}
            className="mt-5"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="What would make this project better?"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
            />
            <button
              type="submit"
              disabled={post.isPending}
              className="mt-3 min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
            >
              {post.isPending ? "Posting…" : "Post feedback"}
            </button>
          </form>
        ) : (
          <p className="mt-5 text-[13px] text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4 hover:text-neon">
              Sign in
            </Link>{" "}
            to leave feedback or upvote.
          </p>
        )}

        <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
          {commentsResult.isLoading && !comments ? (
            <li className="p-4 sm:p-5">
              <SkeletonLines rows={3} />
            </li>
          ) : commentsResult.isError && !comments ? (
            <li>
              <LoadFailure
                message="Feedback couldn't load just now."
                onRetry={() => commentsResult.refetch()}
              />
            </li>
          ) : (comments ?? []).length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground sm:px-5">
              No feedback yet.
            </li>
          ) : (
            (comments ?? []).map((c) => (
              <li key={c.id} className="px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[13px]">
                  <UserAvatar
                    name={c.author?.display_name}
                    path={c.author?.avatar_url}
                    accent={c.author?.accent_color}
                    size={24}
                  />
                  <span className="truncate font-medium">
                    {c.author?.display_name ?? "Someone"}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {relativeTime(c.created_at)}
                  </span>
                </div>
                {editingId === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit.mutate({ id: c.id, body: editDraft });
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
                        disabled={saveEdit.isPending}
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
                    {c.body}
                  </p>
                )}
                {c.author_id === userId && editingId !== c.id ? (
                  <div className="mt-2.5 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditDraft(c.body);
                      }}
                      className="transition-colors duration-200 hover:text-neon"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(c.id)}
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
      </section>
    </div>
  );
}
