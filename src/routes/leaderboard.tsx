import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RaceTrack } from "@/components/race-track";
import { SeasonBanner } from "@/components/season-banner";
import { SectionHeading } from "@/components/section-heading";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { useRace } from "@/hooks/use-race";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";

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
  const { all, isLoading, isError, refetch } = useRace(10);
  const { userId } = useAuth();
  const me = all.find((r) => r.id === userId);
  const inTop = all.slice(0, 20).some((r) => r.id === userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">The race</h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Positions come from upvotes on published projects, straight from the database. Cars move
        the moment a vote lands.
      </p>

      <div className="mt-8 sm:mt-10">
        <SeasonBanner />
      </div>

      <div className="mt-8">
        <RaceTrack />
      </div>

      <div className="mt-14 sm:mt-16">
        <SectionHeading title="Standings" subtitle="Upvotes received, updated live." />
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_72px] gap-3 border-b border-border px-4 py-3 text-[12px] text-muted-foreground sm:grid-cols-[56px_minmax(0,1fr)_90px_110px] sm:gap-4 sm:px-5">
            <span>Rank</span>
            <span>Builder</span>
            <span className="text-right">Votes</span>
            <span className="hidden text-right sm:block">Projects</span>
          </div>

          {isLoading && all.length === 0 ? (
            <SkeletonLines rows={6} className="p-4 sm:p-5" />
          ) : isError && all.length === 0 ? (
            <LoadFailure
              message="The standings couldn't load just now."
              onRetry={() => refetch()}
            />
          ) : all.length === 0 ? (
            <div className="px-5 py-8 text-[13px] text-muted-foreground">
              No builders on the board yet.
            </div>
          ) : (
            all.slice(0, 20).map((r) => (
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
                <span className="hidden text-right font-mono tabular-nums text-muted-foreground sm:block">
                  {r.project_count ?? 0}
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
    </div>
  );
}
