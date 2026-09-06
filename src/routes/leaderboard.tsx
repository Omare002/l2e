import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { RaceTrack } from "@/components/race-track";
import { SeasonBanner } from "@/components/season-banner";
import { SectionHeading } from "@/components/section-heading";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { useRace } from "@/hooks/use-race";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";
import { MessageButton } from "@/components/messages/message-button";
import { QuestBoard } from "@/components/quest-board";
import { myFollowingQuery } from "@/lib/discovery";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Live race leaderboard — Leaderboard" },
      {
        name: "description",
        content:
          "Watch the weekly LearnToEarn race in real time. Every upvote moves a builder's car closer to the finish line.",
      },
      { property: "og:title", content: "Live race leaderboard — Leaderboard" },
      {
        property: "og:description",
        content: "Every upvote moves a builder's car closer to the finish line.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { all, isLoading, isError, refetch, season } = useRace(10, "week");
  const allTime = useRace(20, "all");
  const { userId, isAuthenticated } = useAuth();
  const [view, setView] = useState<"all" | "following">("all");
  const { data: followingIds } = useQuery(myFollowingQuery(userId));
  const followSet = new Set(followingIds ?? []);
  const visible = view === "following" ? all.filter((r) => followSet.has(r.id ?? "")) : all;
  const me = all.find((r) => r.id === userId);
  const inTop = visible.slice(0, 20).some((r) => r.id === userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">The race</h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Positions come from upvotes on published projects during the running race week. Cars move
        the moment a vote lands, and every week starts a fresh race.
      </p>

      <div className="mt-8 sm:mt-10">
        <SeasonBanner />
      </div>

      <div className="mt-8">
        <RaceTrack scope="week" />
      </div>

      <div className="mt-14 sm:mt-16">
        <SectionHeading
          title={`Week ${season.week} standings`}
          subtitle={`${new Date(season.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(new Date(season.endsAt).getTime() - 1).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · upvotes this week, updated live.`}
        />
        {isAuthenticated ? (
          <div className="mb-4 inline-flex rounded-full border border-border p-1 text-[12px]">
            {(["all", "following"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`min-h-9 rounded-full px-4 transition-colors duration-200 ${
                  view === key
                    ? "bg-neon/12 text-neon"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {key === "all" ? "Everyone" : `Following${followSet.size ? ` (${followSet.size})` : ""}`}
              </button>
            ))}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_72px] gap-3 border-b border-border px-4 py-3 text-[12px] text-muted-foreground sm:grid-cols-[56px_minmax(0,1fr)_90px_110px] sm:gap-4 sm:px-5">
            <span>Rank</span>
            <span>Builder</span>
            <span className="text-right">Votes</span>
            <span className="hidden text-right sm:block">Projects</span>
          </div>

          {isLoading && visible.length === 0 ? (
            <SkeletonLines rows={6} className="p-4 sm:p-5" />
          ) : isError && visible.length === 0 ? (
            <LoadFailure
              message="The standings couldn't load just now."
              onRetry={() => refetch()}
            />
          ) : visible.length === 0 ? (
            <div className="px-5 py-8 text-[13px] text-muted-foreground">
              {view === "following"
                ? "None of the builders you follow are racing this week yet."
                : "No builders on the board yet."}
            </div>
          ) : (
            visible.slice(0, 20).map((r) => (
              <motion.div
                key={r.id}
                layout
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3 border-b border-border px-4 py-4 text-[13px] transition-colors duration-200 last:border-b-0 hover:bg-muted/50 sm:grid-cols-[56px_minmax(0,1fr)_90px_110px] sm:gap-4 sm:px-5 ${
                  r.id === userId ? "bg-neon-dim/40" : ""
                }`}
              >
                <span className="font-mono tabular-nums text-muted-foreground">
                  {String(r.rank ?? 0).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={r.display_name}
                    path={r.avatar_url}
                    accent={r.accent_color}
                    size={28}
                  />
                  <Link
                    to="/builders/$username"
                    params={{ username: r.username ?? "" }}
                    className="min-w-0 truncate transition-colors duration-200 hover:text-neon"
                  >
                    <span className="font-medium">{r.display_name}</span>
                    <span className="text-muted-foreground"> @{r.username}</span>
                  </Link>
                </span>
                <span className="text-right font-mono tabular-nums">
                  {(r.score ?? 0).toLocaleString()}
                </span>
                <span className="hidden items-center justify-end gap-1 text-right font-mono tabular-nums text-muted-foreground sm:flex">
                  {r.project_count ?? 0}
                  <MessageButton recipientId={r.id} variant="icon" label="Message builder" />
                </span>
              </motion.div>
            ))
          )}
        </div>

        {me && !inTop ? (
          <div className="mt-4 grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3 rounded-lg border border-neon/50 px-4 py-4 text-[13px]">
            <span className="font-mono tabular-nums">{String(me.rank ?? 0).padStart(2, "0")}</span>
            <span className="min-w-0 truncate">
              <span className="font-medium">{me.display_name}</span>
              <span className="ml-2 font-mono text-[10px] text-neon">you</span>
            </span>
            <span className="text-right font-mono tabular-nums">
              {(me.score ?? 0).toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>

      <QuestBoard />

      <div className="mt-14 sm:mt-16">
        <SectionHeading
          title="All-time board"
          subtitle="Every upvote a builder has ever received. Weekly races never reset this."
        />
        <div className="overflow-hidden rounded-lg border border-border">
          {allTime.isLoading && allTime.all.length === 0 ? (
            <SkeletonLines rows={5} className="p-4 sm:p-5" />
          ) : allTime.isError && allTime.all.length === 0 ? (
            <LoadFailure
              message="The all-time board couldn't load just now."
              onRetry={() => allTime.refetch()}
            />
          ) : allTime.all.length === 0 ? (
            <div className="px-5 py-8 text-[13px] text-muted-foreground">
              No builders on the board yet.
            </div>
          ) : (
            allTime.all.slice(0, 10).map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3 border-b border-border px-4 py-3.5 text-[13px] last:border-b-0 sm:px-5"
              >
                <span className="font-mono tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  to="/builders/$username"
                  params={{ username: r.username ?? "" }}
                  className="min-w-0 truncate transition-colors duration-200 hover:text-neon"
                >
                  <span className="font-medium">{r.display_name}</span>
                  <span className="text-muted-foreground"> @{r.username}</span>
                </Link>
                <span className="text-right font-mono tabular-nums">
                  {(r.score ?? 0).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
