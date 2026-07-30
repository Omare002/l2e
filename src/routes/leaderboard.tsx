import { createFileRoute, Link } from "@tanstack/react-router";
import { RaceTrack } from "@/components/race-track";
import { SeasonBanner } from "@/components/season-banner";
import { SectionHeading } from "@/components/section-heading";
import { useRace } from "@/hooks/use-race";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Live Race Leaderboard — Leaderboard" },
      {
        name: "description",
        content:
          "Watch the weekly LearnToEarn race in real time. Every upvote moves a builder's car closer to the finish line.",
      },
      { property: "og:title", content: "Live Race Leaderboard — Leaderboard" },
      {
        property: "og:description",
        content: "Every upvote moves a builder's car closer to the finish line.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { racers, target } = useRace();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">The race</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Positions are driven by this week's votes only. Every season resets on Monday, so a
        quiet week never buries a good builder for good.
      </p>

      <div className="mt-10">
        <SeasonBanner />
      </div>

      <div className="mt-8">
        <RaceTrack />
      </div>

      <div className="mt-16">
        <SectionHeading title="Standings" subtitle="Weekly votes, updated live." />
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[56px_1fr_90px_110px] gap-4 border-b border-border px-5 py-3.5 text-[12px] text-muted-foreground">
            <span>Rank</span>
            <span>Builder / Project</span>
            <span className="text-right">Votes</span>
            <span className="text-right">To finish</span>
          </div>
          {racers.map((r, i) => (
            <div
              key={r.builder.username}
              className="grid grid-cols-[56px_1fr_90px_110px] items-center gap-4 border-b border-border px-5 py-4 text-[13px] transition-colors duration-200 last:border-b-0 hover:bg-muted/50"
            >
              <span
                className={`font-mono tabular-nums ${
                  i === 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-ink"
                  style={{ background: r.builder.color }}
                >
                  {r.builder.initials}
                </span>
                <Link
                  to="/builders/$username"
                  params={{ username: r.builder.username }}
                  className="truncate transition-colors duration-200 hover:text-neon"
                >
                  <span className="font-medium">{r.builder.name}</span>
                  <span className="text-muted-foreground"> · {r.project?.name}</span>
                </Link>
              </span>
              <span className="text-right font-mono tabular-nums">{r.votes.toLocaleString()}</span>
              <span className="text-right font-mono tabular-nums text-muted-foreground">
                {Math.max(0, target - r.votes)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
