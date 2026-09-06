import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/section-heading";
import { SkeletonLines } from "@/components/skeleton-block";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { leaderboardQuery } from "@/lib/db";
import {
  QUEST_KIND_LABEL,
  type QuestKind,
  type QuestListRow,
  questKeys,
  questsQuery,
  timeLeft,
} from "@/lib/quests";
import { respondToQuest } from "@/lib/quests.functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Leaderboard" },
      {
        name: "description",
        content:
          "Active quests, upcoming deadlines and featured builders from the LearnToEarn community.",
      },
      { property: "og:title", content: "Community — Leaderboard" },
      {
        property: "og:description",
        content:
          "Active quests, upcoming deadlines and featured builders from the LearnToEarn community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

function isOpen(q: QuestListRow) {
  return !q.closed_at && new Date(q.ends_at) > new Date();
}

function CommunityPage() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const quests = useQuery(questsQuery());
  const builders = useQuery(leaderboardQuery());

  const join = useMutation({
    mutationFn: async (questId: string) =>
      respondToQuest({ data: { questId, action: "join" } }),
    onSuccess: () => {
      toast.success("You're in — pick a project on the quest page when you're ready");
      void queryClient.invalidateQueries({ queryKey: questKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not join this quest"),
  });

  const active = (quests.data ?? []).filter(isOpen);
  const deadlines = [...active].sort(
    (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime(),
  );
  const featured = (builders.data ?? []).slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Community
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Race together this week
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">
          Active quests, the deadlines coming up, and the builders setting the pace. Join an open
          quest right here — no detours.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-12">
        {/* Active quests with inline join */}
        <section aria-label="Active quests">
          <SectionHeading
            title="Active quests"
            subtitle="Open races you can join now. One click and you're on the grid."
          />
          {quests.isLoading ? (
            <SkeletonLines rows={3} className="p-4" />
          ) : quests.isError ? (
            <p className="text-[13px] text-muted-foreground">
              Quests couldn't load right now — the rest of the community page still works.
            </p>
          ) : active.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No open quests right now —{" "}
              <Link to="/quests" className="underline underline-offset-4 hover:text-neon">
                start one
              </Link>{" "}
              and invite a few builders.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {active.map((q) => {
                const joined = (q.participants ?? []).filter(
                  (p) => p.status === "accepted",
                ).length;
                return (
                  <li key={q.id} className="surface-card lift-hover flex flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="glass-pill-dark px-2.5 py-1 font-mono text-[10px] text-on-dark">
                        {QUEST_KIND_LABEL[q.kind as QuestKind] ?? "Quest"}
                      </span>
                      <span className="font-mono text-[10px] text-on-dark-muted">
                        {timeLeft(q.ends_at)}
                      </span>
                    </div>
                    <Link
                      to="/quests/$id"
                      params={{ id: q.id }}
                      className="mt-4 text-[15px] font-semibold tracking-tight text-on-dark transition-colors duration-200 hover:text-neon"
                    >
                      {q.title}
                    </Link>
                    {q.task ? (
                      <p className="mt-1 font-mono text-[11px] text-on-dark-muted">
                        Task: {q.task.title}
                      </p>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-on-dark-muted">
                        <Users className="size-3.5" /> {joined} racing
                      </span>
                      {isAuthenticated ? (
                        <button
                          type="button"
                          disabled={join.isPending}
                          onClick={() => join.mutate(q.id)}
                          className="rounded-full bg-neon px-4 py-2 text-[12px] font-semibold text-background transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
                        >
                          {join.isPending && join.variables === q.id ? "Joining…" : "Join quest"}
                        </button>
                      ) : (
                        <Link
                          to="/auth"
                          className="glass-pill-dark px-4 py-2 text-[12px] font-medium text-on-dark transition-colors duration-200 hover:border-neon/40 hover:text-neon"
                        >
                          Sign in to join
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-10">
          {/* Upcoming deadlines */}
          <section aria-label="Upcoming deadlines">
            <SectionHeading title="Deadlines" subtitle="Soonest first." />
            {quests.isLoading ? (
              <SkeletonLines rows={3} className="p-4" />
            ) : deadlines.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nothing on the clock.</p>
            ) : (
              <ol className="space-y-2">
                {deadlines.slice(0, 6).map((q) => (
                  <li key={q.id}>
                    <Link
                      to="/quests/$id"
                      params={{ id: q.id }}
                      className="surface-card flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:border-neon/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {q.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                          <CalendarClock className="size-3" />
                          {new Date(q.ends_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-neon">
                        {timeLeft(q.ends_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Featured builders */}
          <section aria-label="Featured builders">
            <SectionHeading title="Featured builders" subtitle="Top of the board right now." />
            {builders.isLoading ? (
              <SkeletonLines rows={4} className="p-4" />
            ) : builders.isError || featured.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Standings unavailable — check the leaderboard.
              </p>
            ) : (
              <ol className="space-y-2">
                {featured.map((b) => (
                  <li key={b.username ?? b.rank}>
                    <Link
                      to="/builders/$username"
                      params={{ username: b.username ?? "" }}
                      className="surface-card flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:border-neon/30"
                    >
                      <span
                        className={`w-7 shrink-0 font-mono text-[11px] tabular-nums ${
                          (b.rank ?? 99) <= 3 ? "text-neon" : "text-muted-foreground"
                        }`}
                      >
                        #{b.rank}
                      </span>
                      <UserAvatar
                        name={b.display_name ?? "Builder"}
                        path={b.avatar_url}
                        accent={b.accent_color}
                        size={30}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {b.display_name}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          @{b.username}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Trophy className="size-3 text-neon" />
                        {b.score ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <Link
              to="/builders"
              className="mt-4 inline-block font-mono text-[11px] text-muted-foreground underline underline-offset-4 transition-colors duration-200 hover:text-neon"
            >
              Browse every builder →
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
