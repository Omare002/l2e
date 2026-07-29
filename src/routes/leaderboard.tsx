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
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="font-mono text-4xl font-extrabold uppercase sm:text-5xl">
        The <span className="text-neon">Race</span>
      </h1>
      <p className="mt-4 max-w-2xl font-mono text-[13px] text-muted-foreground">
        Positions are driven by this week's votes only. Every season resets on Monday, so a
        quiet week never buries a good builder for good.
      </p>

      <div className="mt-8">
        <SeasonBanner />
      </div>

      <div className="mt-8">
        <RaceTrack />
      </div>

      <div className="mt-14">
        <SectionHeading title="Standings" subtitle="Weekly votes, live." />
        <div className="border border-border">
          <div className="grid grid-cols-[48px_1fr_90px_120px] gap-3 border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>Rank</span>
            <span>Builder / Project</span>
            <span className="text-right">Votes</span>
            <span className="text-right">To Finish</span>
          </div>
          {racers.map((r, i) => (
            <div
              key={r.builder.username}
              className="grid grid-cols-[48px_1fr_90px_120px] items-center gap-3 border-b border-border px-4 py-3 font-mono text-[12px] last:border-b-0"
            >
              <span className={i === 0 ? "font-bold text-neon" : "text-muted-foreground"}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-6 shrink-0 items-center justify-center text-[10px] font-bold text-ink"
                  style={{ background: r.builder.color }}
                >
                  {r.builder.initials}
                </span>
                <Link
                  to="/builders/$username"
                  params={{ username: r.builder.username }}
                  className="truncate hover:text-neon"
                >
                  <span className="font-bold">{r.builder.name}</span>
                  <span className="text-muted-foreground"> · {r.project?.name}</span>
                </Link>
              </span>
              <span className="text-right font-bold">{r.votes}</span>
              <span className="text-right text-muted-foreground">
                {Math.max(0, target - r.votes)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}