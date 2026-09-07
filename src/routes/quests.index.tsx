import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { createQuest, getInvitableBuilders, respondToQuest } from "@/lib/quests.functions";
import {
  QUEST_KIND_LABEL,
  type QuestListRow,
  type QuestKind,
  isOpenQuest,
  questAccessLabel,
  questKeys,
  questsQuery,
  timeLeft,
  weeklyTasksQuery,
} from "@/lib/quests";
import { currentSeason } from "@/lib/season";

export const Route = createFileRoute("/quests/")({
  head: () => ({
    meta: [
      { title: "Quests — weekly build challenges on Leaderboard" },
      {
        name: "description",
        content:
          "Join a weekly build task, challenge a friend head to head, or race in a small group. The most upvotes during the quest window wins.",
      },
      { property: "og:title", content: "Quests — weekly build challenges" },
      {
        property: "og:description",
        content: "Shared weekly tasks, direct challenges and small group races for LearnToEarn builders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuestsIndex,
});

function QuestsIndex() {
  const { isAuthenticated } = useAuth();
  const quests = useQuery(questsQuery());
  const tasks = useQuery(weeklyTasksQuery());
  const season = currentSeason();

  const thisWeekTask = useMemo(() => {
    const list = tasks.data ?? [];
    return (
      list.find((t) => new Date(t.starts_at) <= new Date() && new Date(t.ends_at) > new Date()) ??
      list[0] ??
      null
    );
  }, [tasks.data]);

  const [open, setOpen] = useState(false);

  const live = (quests.data ?? []).filter((q) => !q.closed_at);
  const past = (quests.data ?? []).filter((q) => q.closed_at);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Quests</h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Take on the week's build task with friends, challenge someone directly, or race in a small
        group. Whoever's project earns the most upvotes before the deadline takes it.
      </p>

      {thisWeekTask ? (
        <div className="glass-panel mt-9 p-6 sm:p-8">
          <div className="font-mono text-[11px] text-muted-foreground">
            This week's task · week {season.week}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {thisWeekTask.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {thisWeekTask.prompt}
          </p>
          <div className="mt-4 font-mono text-[11px] text-muted-foreground">
            {timeLeft(thisWeekTask.ends_at)}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="min-h-12 w-full rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 sm:w-auto"
          >
            {open ? "Cancel" : "Start a quest"}
          </button>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-4 hover:text-neon">
              Sign in
            </Link>{" "}
            to start a quest or accept an invitation.
          </p>
        )}
      </div>

      {open ? (
        <QuestForm
          defaultTaskId={thisWeekTask?.id ?? null}
          defaultEndsAt={thisWeekTask?.ends_at ?? season.endsAt}
          onDone={() => setOpen(false)}
        />
      ) : null}

      <section className="mt-12">
        <h2 className="text-[13px] font-medium">How a quest is won</h2>
        <ul className="mt-4 grid gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <li>Only upvotes landing between the quest start and its deadline count.</li>
          <li>You cannot upvote your own project — self-votes are refused everywhere on the site.</li>
          <li>One upvote per person per project, so nobody can stack votes.</li>
          <li>
            A project can only be entered by its owner, and only once per quest — two builders can
            never race the same entry.
          </li>
          <li>
            At the deadline the highest upvote count wins and is stored permanently. Lifetime
            project likes are never reset.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-[13px] font-medium">Live quests</h2>
        {quests.isLoading ? (
          <SkeletonLines rows={3} />
        ) : quests.isError ? (
          <LoadFailure onRetry={() => void quests.refetch()} message="Could not load quests" />
        ) : live.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">
            No live quests yet. Start the first one.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {live.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[13px] font-medium">Finished</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {past.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestListRow }) {
  const accepted = (quest.participants ?? []).filter((p) => p.status === "accepted").length;
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const runRespond = useServerFn(respondToQuest);
  const openToAll = isOpenQuest(quest);
  const live = !quest.closed_at && new Date(quest.ends_at) > new Date();

  const join = useMutation({
    mutationFn: () => runRespond({ data: { questId: quest.id, action: "join" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questKeys.all });
      toast.success("You're in — pick your entry on the quest page");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not enter this quest"),
  });

  return (
    <div className="surface-card lift-hover p-5 sm:p-6">
      <Link to="/quests/$id" params={{ id: quest.id }} className="block">
      <div className="flex flex-wrap items-center gap-2">
        <span className="glass-pill min-w-0 truncate px-2.5 py-1 font-mono text-[10px] text-on-dark-muted">
          {QUEST_KIND_LABEL[quest.kind as QuestKind] ?? "Quest"}
        </span>
        <span
          className={`glass-pill shrink-0 px-2.5 py-1 font-mono text-[10px] ${
            openToAll ? "border-neon/35 text-neon" : "text-on-dark-muted"
          }`}
        >
          {questAccessLabel(quest)}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-on-dark-muted">
          {timeLeft(quest.ends_at)}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-on-dark">{quest.title}</h3>
      {quest.task ? (
        <p className="mt-1 font-mono text-[11px] text-on-dark-muted">Task: {quest.task.title}</p>
      ) : null}
      {quest.description ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-on-dark-muted">
          {quest.description}
        </p>
      ) : null}
      <div className="mt-5 flex items-center gap-4 font-mono text-[11px] text-on-dark-muted">
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" /> {accepted}
        </span>
        {quest.winner ? (
          <span className="flex items-center gap-1.5 text-neon">
            <Trophy className="size-3.5" /> {quest.winner.display_name} · {quest.winner_votes}
          </span>
        ) : null}
      </div>
      </Link>
      {live ? (
        <div className="mt-4">
          {!isAuthenticated ? (
            <Link
              to="/auth"
              className="flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-[12px] text-on-dark-muted transition-colors duration-200 hover:border-neon hover:text-neon"
            >
              Sign in to enter
            </Link>
          ) : openToAll ? (
            <button
              type="button"
              disabled={join.isPending}
              onClick={() => join.mutate()}
              className="flex min-h-10 w-full items-center justify-center rounded-full bg-foreground px-4 text-[12px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60 sm:w-auto"
            >
              {join.isPending ? "Entering…" : "Enter quest"}
            </button>
          ) : (
            <span className="font-mono text-[11px] text-on-dark-muted">
              Private — invitation only
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function QuestForm({
  defaultTaskId,
  defaultEndsAt,
  onDone,
}: {
  defaultTaskId: string | null;
  defaultEndsAt: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const runCreate = useServerFn(createQuest);
  const runSearch = useServerFn(getInvitableBuilders);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<QuestKind>("shared_task");
  const [term, setTerm] = useState("");
  const [invite, setInvite] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [endsAt, setEndsAt] = useState(() => new Date(defaultEndsAt).toISOString().slice(0, 16));

  const people = useQuery({
    queryKey: ["invitable-builders", term],
    queryFn: () => runSearch({ data: { term } }),
    staleTime: 15_000,
  });

  const create = useMutation({
    mutationFn: () =>
      runCreate({
        data: {
          title,
          description,
          kind,
          visibility,
          taskId: kind === "shared_task" ? defaultTaskId : null,
          endsAt: new Date(endsAt).toISOString(),
          invite,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questKeys.all });
      toast.success("Quest created — invitations sent");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create this quest"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
      className="glass-panel mt-6 grid gap-4 p-6"
    >
      <div className="grid gap-2">
        <label className="text-[12px] text-muted-foreground" htmlFor="quest-title">
          Quest name
        </label>
        <input
          id="quest-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Landing page sprint"
          className="min-h-12 rounded-lg border border-border bg-transparent px-4 text-[14px] outline-none focus-visible:border-neon"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-[12px] text-muted-foreground" htmlFor="quest-desc">
          What's the challenge?
        </label>
        <textarea
          id="quest-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-lg border border-border bg-transparent px-4 py-3 text-[14px] outline-none focus-visible:border-neon"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <span className="text-[12px] text-muted-foreground">Type</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUEST_KIND_LABEL) as QuestKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`glass-pill px-3 py-1.5 font-mono text-[11px] transition-colors duration-200 ${
                  kind === k ? "border-neon/45 text-neon" : "text-muted-foreground"
                }`}
              >
                {QUEST_KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-[12px] text-muted-foreground" htmlFor="quest-ends">
            Deadline
          </label>
          <input
            id="quest-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="min-h-12 rounded-lg border border-border bg-transparent px-4 text-[14px] outline-none focus-visible:border-neon"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-[12px] text-muted-foreground">Who can enter</span>
        <div className="flex flex-wrap gap-2">
          {([
            ["public", "Open — anyone can enter"],
            ["private", "Private — invite only"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`glass-pill px-3 py-1.5 font-mono text-[11px] transition-colors duration-200 ${
                visibility === value ? "border-neon/45 text-neon" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {visibility === "public"
            ? "Listed publicly and any signed-in builder can enter."
            : "Only the builders you invite can enter."}
        </p>
      </div>

      <div className="grid gap-2">
        <label className="text-[12px] text-muted-foreground" htmlFor="quest-invite">
          Invite builders
        </label>
        <input
          id="quest-invite"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name or username"
          className="min-h-12 rounded-lg border border-border bg-transparent px-4 text-[14px] outline-none focus-visible:border-neon"
        />
        <div className="mt-1 flex flex-wrap gap-2">
          {(people.data ?? []).map((p) => {
            const on = invite.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setInvite((prev) => (on ? prev.filter((i) => i !== p.id) : [...prev, p.id]))
                }
                className={`glass-pill flex items-center gap-2 px-2.5 py-1.5 text-[12px] transition-colors duration-200 ${
                  on ? "border-neon/45 text-neon" : "text-muted-foreground"
                }`}
              >
                <UserAvatar
                  name={p.display_name}
                  path={p.avatar_url}
                  accent={p.accent_color}
                  size={20}
                />
                {p.display_name}
              </button>
            );
          })}
          {(people.data ?? []).length === 0 ? (
            <span className="text-[12px] text-muted-foreground">
              Follow builders or search by name to invite them.
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={create.isPending || title.trim().length < 3}
        className="min-h-12 w-full rounded-full sm:w-auto sm:justify-self-start bg-foreground px-5 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-50"
      >
        {create.isPending ? "Creating…" : "Create quest"}
      </button>
    </form>
  );
}
