import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { myProjectsQuery } from "@/lib/db";
import { respondToQuest, submitQuestProject } from "@/lib/quests.functions";
import { QUEST_KIND_LABEL, type QuestKind, questKeys, questQuery, timeLeft } from "@/lib/quests";

export const Route = createFileRoute("/quests/$id")({
  head: () => ({
    meta: [
      { title: "Quest standings — Leaderboard" },
      {
        name: "description",
        content:
          "Follow a quest live: who joined, what they submitted, and who is ahead on upvotes before the deadline.",
      },
      { property: "og:title", content: "Quest standings — Leaderboard" },
      {
        property: "og:description",
        content: "Live quest standings decided by real upvotes during the quest window.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuestDetailPage,
});

function QuestDetailPage() {
  const { id } = Route.useParams();
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const detail = useQuery(questQuery(id));
  const mine = useQuery({ ...myProjectsQuery(userId ?? ""), enabled: Boolean(userId) });

  const runRespond = useServerFn(respondToQuest);
  const runSubmit = useServerFn(submitQuestProject);

  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: questKeys.one(id) });
    queryClient.invalidateQueries({ queryKey: questKeys.all });
  };

  const respond = useMutation({
    mutationFn: (action: "accept" | "decline" | "join") =>
      runRespond({ data: { questId: id, action } }),
    onSuccess: (r) => {
      refresh();
      toast.success(r.status === "declined" ? "Invitation declined" : "You're in");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update your answer"),
  });

  const enter = useMutation({
    mutationFn: (projectId: string) => runSubmit({ data: { questId: id, projectId } }),
    onSuccess: () => {
      refresh();
      toast.success("Project entered");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not enter your project"),
  });

  if (detail.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SkeletonLines rows={5} />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <LoadFailure onRetry={() => void detail.refetch()} message="Could not load this quest" />
      </div>
    );
  }

  const { quest, standings } = detail.data;
  const me = standings.find((s) => s.user_id === userId) ?? null;
  const finished = Boolean(quest.closed_at) || new Date(quest.ends_at) <= new Date();
  const accepted = standings.filter((s) => s.status === "accepted");
  const invited = standings.filter((s) => s.status === "invited");

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
      <Link to="/quests" className="font-mono text-[11px] text-muted-foreground hover:text-neon">
        ← All quests
      </Link>

      <div className="glass-panel mt-5 p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-pill px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            {QUEST_KIND_LABEL[quest.kind as QuestKind] ?? "Quest"}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {finished ? "Finished" : timeLeft(quest.ends_at)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">{quest.title}</h1>
        {quest.task ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Weekly task: {quest.task.title}
          </p>
        ) : null}
        {quest.description ? (
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {quest.description}
          </p>
        ) : null}
        <div className="mt-5 flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
          {quest.creator ? (
            <>
              <UserAvatar
                name={quest.creator.display_name}
                path={quest.creator.avatar_url}
                accent={quest.creator.accent_color}
                size={24}
              />
              Started by {quest.creator.display_name}
            </>
          ) : null}
        </div>
        <div className="mt-4 font-mono text-[11px] text-muted-foreground">
          Deadline {new Date(quest.ends_at).toLocaleString()}
        </div>

        {quest.winner ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-neon/30 bg-neon-dim/20 px-4 py-3 text-[14px] text-neon">
            <Trophy className="size-4" /> {quest.winner.display_name} won with {quest.winner_votes}{" "}
            upvotes
          </div>
        ) : finished ? (
          <div className="mt-6 text-[13px] text-muted-foreground">
            This quest ended without any upvoted entries.
          </div>
        ) : null}

        {isAuthenticated && !finished ? (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {!me ? (
              <button
                type="button"
                onClick={() => respond.mutate("join")}
                className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/90"
              >
                Join quest
              </button>
            ) : me.status === "invited" ? (
              <>
                <button
                  type="button"
                  onClick={() => respond.mutate("accept")}
                  className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/90"
                >
                  Accept invitation
                </button>
                <button
                  type="button"
                  onClick={() => respond.mutate("decline")}
                  className="glass-pill min-h-11 px-5 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Decline
                </button>
              </>
            ) : me.status === "declined" ? (
              <button
                type="button"
                onClick={() => respond.mutate("accept")}
                className="glass-pill min-h-11 px-5 text-[13px] text-muted-foreground hover:text-neon"
              >
                Change your mind — join
              </button>
            ) : null}
          </div>
        ) : null}

        {isAuthenticated && me && me.status === "accepted" && !finished ? (
          <div className="mt-6 grid gap-2">
            <label className="text-[12px] text-muted-foreground" htmlFor="quest-project">
              Your entry
            </label>
            <select
              id="quest-project"
              value={me.project_id ?? ""} defaultValue={undefined}
              onChange={(e) => e.target.value && enter.mutate(e.target.value)}
              className="min-h-11 max-w-sm rounded-lg border border-border bg-transparent px-3 text-[13px] outline-none focus-visible:border-neon"
            >
              <option value="">Choose a project…</option>
              {(mine.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-[13px] font-medium">
          Standings <span className="text-muted-foreground">· upvotes during this quest</span>
        </h2>
        {accepted.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No entries yet.</p>
        ) : (
          <ol className="surface-card mt-4 divide-y divide-white/[0.05]">
            {accepted.map((s, i) => (
              <li key={s.user_id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
                <span
                  className={`font-mono text-[12px] tabular-nums ${
                    i === 0 ? "text-neon" : "text-on-dark-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={s.display_name}
                    path={s.avatar_url}
                    accent={s.accent_color}
                    size={28}
                  />
                  <div className="min-w-0 leading-tight">
                    <Link
                      to="/builders/$username"
                      params={{ username: s.username }}
                      className="block truncate text-[13px] font-medium text-on-dark hover:text-neon"
                    >
                      {s.display_name}
                    </Link>
                    {s.project_slug ? (
                      <Link
                        to="/projects/$slug"
                        params={{ slug: s.project_slug }}
                        className="block truncate font-mono text-[11px] text-on-dark-muted hover:text-neon"
                      >
                        {s.project_title}
                      </Link>
                    ) : (
                      <span className="block font-mono text-[11px] text-on-dark-muted">
                        No entry yet
                      </span>
                    )}
                  </div>
                </div>
                <span className="glass-pill flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] tabular-nums text-on-dark-muted">
                  <ChevronUp className="size-3.5" /> {s.votes}
                </span>
              </li>
            ))}
          </ol>
        )}

        {invited.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-[12px] text-muted-foreground">Invited</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {invited.map((s) => (
                <span
                  key={s.user_id}
                  className="glass-pill flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-muted-foreground"
                >
                  <UserAvatar
                    name={s.display_name}
                    path={s.avatar_url}
                    accent={s.accent_color}
                    size={20}
                  />
                  {s.display_name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
