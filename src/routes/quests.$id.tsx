import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronUp, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { QuestChat } from "@/components/quest-chat";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { myProjectsQuery } from "@/lib/db";
import {
  deleteQuest,
  leaveQuest,
  respondToQuest,
  setQuestVisibility,
  submitQuestProject,
  updateQuest,
} from "@/lib/quests.functions";
import {
  QUEST_KIND_LABEL,
  QUEST_STATE_LABEL,
  type QuestKind,
  isOpenQuest,
  myQuestEntryQuery,
  questAccessLabel,
  questCreatorQuery,
  questKeys,
  questQuery,
  questRosterQuery,
  questState,
  questSubmissionsQuery,
  sinceLabel,
  timeLeft,
} from "@/lib/quests";

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
  const entry = useQuery(myQuestEntryQuery(id, userId));
  const creator = useQuery(questCreatorQuery(id, userId));
  const submissions = useQuery(
    questSubmissionsQuery(id, Boolean(creator.data?.isCreator)),
  );

  const runRespond = useServerFn(respondToQuest);
  const runSubmit = useServerFn(submitQuestProject);
  const runVisibility = useServerFn(setQuestVisibility);

  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: questKeys.one(id) });
    queryClient.invalidateQueries({ queryKey: questKeys.all });
    queryClient.invalidateQueries({ queryKey: questKeys.entry(id, userId ?? "anon") });
    queryClient.invalidateQueries({ queryKey: questKeys.mine(userId ?? "anon") });
    queryClient.invalidateQueries({ queryKey: questKeys.submissions(id) });
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

  const visibility = useMutation({
    mutationFn: (next: "public" | "private") =>
      runVisibility({ data: { questId: id, visibility: next } }),
    onSuccess: (r) => {
      refresh();
      toast.success(
        (r as { visibility?: string })?.visibility === "private"
          ? "Quest is private — invited builders only"
          : "Quest is open — anyone can enter",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this quest"),
  });

  const enter = useMutation({
    mutationFn: (projectId: string) => runSubmit({ data: { questId: id, projectId } }),
    onSuccess: () => {
      refresh();
      toast.success("Project submitted");
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
  const me = entry.data ?? null;
  const finished = Boolean(quest.closed_at) || new Date(quest.ends_at) <= new Date();
  const accepted = standings.filter((s) => s.status === "accepted");
  const invited = standings.filter((s) => s.status === "invited");

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
      <Link to="/quests" className="font-mono text-[11px] text-muted-foreground hover:text-neon">
        ← All quests
      </Link>

      <div className="glass-panel mt-5 p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="glass-pill px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            {QUEST_KIND_LABEL[quest.kind as QuestKind] ?? "Quest"}
          </span>
          <span
            className={`glass-pill px-2.5 py-1 font-mono text-[10px] ${
              isOpenQuest(quest) ? "border-neon/35 text-neon" : "text-muted-foreground"
            }`}
          >
            {questAccessLabel(quest)}
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
              !isOpenQuest(quest) ? (
                <p className="text-[13px] text-muted-foreground">
                  {quest.kind === "challenge"
                    ? "This is a direct challenge — you need an invitation to enter."
                    : "This quest is private — only builders the creator invites can enter."}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate("join")}
                  className="min-h-11 w-full rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60 sm:w-auto"
                >
                  {respond.isPending ? "Entering…" : "Enter quest"}
                </button>
              )
            ) : me.status === "invited" ? (
              <>
                <button
                  type="button"
                  onClick={() => respond.mutate("accept")}
                  className="min-h-11 w-full rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 sm:w-auto"
                >
                  Accept invitation
                </button>
                <button
                  type="button"
                  onClick={() => respond.mutate("decline")}
                  className="glass-pill min-h-11 w-full px-5 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground sm:w-auto"
                >
                  Decline
                </button>
              </>
            ) : me.status === "declined" ? (
              <button
                type="button"
                onClick={() => respond.mutate("accept")}
                className="glass-pill min-h-11 w-full px-5 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-neon sm:w-auto"
              >
                Change your mind — join
              </button>
            ) : null}
          </div>
        ) : null}

        {creator.data?.isCreator && !finished ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-[12px] text-muted-foreground">Who can enter</span>
            <button
              type="button"
              disabled={visibility.isPending}
              onClick={() =>
                visibility.mutate(quest.visibility === "private" ? "public" : "private")
              }
              className="glass-pill min-h-10 px-4 text-[12px] transition-colors duration-200 hover:text-neon disabled:opacity-60"
            >
              {quest.visibility === "private" ? "Make it open to everyone" : "Make it private"}
            </button>
          </div>
        ) : null}

        {isAuthenticated && me && me.status === "accepted" ? (
          <div className="mt-6 border-t border-border pt-6">
            <div className="text-[13px] font-medium">Your submission</div>
            {me.project_id ? (
              <p className="mt-2 text-[13px] text-muted-foreground">
                Entered
                {me.submitted_at
                  ? ` on ${new Date(me.submitted_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : ""}
                .
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-muted-foreground">
                No project submitted yet.
              </p>
            )}

            {finished ? (
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                Submissions are locked — the deadline has passed.
              </p>
            ) : (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,22rem)_auto] sm:items-center">
                <select
                  id="quest-project"
                  aria-label="Submit a project"
                  value={me.project_id ?? ""}
                  disabled={enter.isPending}
                  onChange={(e) => e.target.value && enter.mutate(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-border bg-transparent px-3 text-[13px] outline-none focus-visible:border-neon"
                >
                  <option value="">
                    {me.project_id ? "Change your entry…" : "Submit an existing project…"}
                  </option>
                  {(mine.data ?? []).map((p) => (
                    <option key={p.id ?? p.title} value={p.id ?? ""}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <Link
                  to="/submit"
                  search={{ quest: id }}
                  className="glass-pill inline-flex min-h-11 items-center justify-center px-4 text-[12px] transition-colors duration-200 hover:text-neon"
                >
                  New project for this quest
                </Link>
              </div>
            )}
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
              <li key={s.username} className="px-4 py-4 sm:px-5">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
                  <span className="glass-pill flex shrink-0 items-center gap-1 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-on-dark-muted">
                    <ChevronUp className="size-3.5" /> {s.votes}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[1.6rem] font-mono text-[10px] text-on-dark-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> joined {sinceLabel(s.joined_at)}
                  </span>
                  <span>
                    {!s.project_slug
                      ? "no project entered"
                      : s.project_published === false
                        ? "entry is a draft"
                        : `entry live${s.project_status ? ` · ${s.project_status}` : ""}`}
                  </span>
                  <span>
                    {s.votes === 1 ? "1 upvote earned" : `${s.votes} upvotes earned`}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}


        {creator.data?.isCreator ? (
          <div className="mt-8">
            <h3 className="text-[12px] text-muted-foreground">
              Submissions <span className="text-muted-foreground/70">· creator view</span>
            </h3>
            {submissions.isLoading ? (
              <SkeletonLines rows={2} className="mt-3 p-4" />
            ) : (submissions.data ?? []).length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">No participants yet.</p>
            ) : (
              <ul className="surface-card mt-3 divide-y divide-white/[0.05]">
                {(submissions.data ?? []).map((sub) => (
                  <li
                    key={sub.member?.username ?? sub.joined_at}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <span className="min-w-0 text-[13px] text-on-dark">
                      {sub.member?.display_name ?? "Builder"}
                      <span className="ml-2 font-mono text-[10px] text-on-dark-muted">
                        {sub.status}
                      </span>
                    </span>
                    <span className="min-w-0 text-right font-mono text-[11px] text-on-dark-muted">
                      {sub.project ? (
                        <>
                          <Link
                            to="/projects/$slug"
                            params={{ slug: sub.project.slug }}
                            className="text-on-dark hover:text-neon"
                          >
                            {sub.project.title}
                          </Link>
                          {sub.project.published ? "" : " · draft"}
                          {sub.submitted_at
                            ? ` · ${new Date(sub.submitted_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}`
                            : ""}
                        </>
                      ) : (
                        "no submission"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {invited.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-[12px] text-muted-foreground">Invited</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {invited.map((s) => (
                <span
                  key={s.username}
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

      {isAuthenticated && me ? <QuestChat questId={id} canPost={me.status === "accepted"} /> : null}
    </div>
  );
}
