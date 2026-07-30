import { createFileRoute, Link } from "@tanstack/react-router";
import { AchievementTiles } from "@/components/achievement-tiles";
import { SeasonBanner } from "@/components/season-banner";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How the Race Works — Leaderboard" },
      {
        name: "description",
        content:
          "Weekly seasons, vote-driven race positions, feedback culture and the badges you can earn in the LearnToEarn showcase.",
      },
      { property: "og:title", content: "How the Race Works — Leaderboard" },
      {
        property: "og:description",
        content: "Weekly seasons, vote-driven race positions, and the badges you can earn.",
      },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    n: "01",
    title: "Ship something",
    body: "Submit any project — prototype, half-built, or fully launched. Progress counts.",
  },
  {
    n: "02",
    title: "Get real feedback",
    body: "Members leave constructive notes, ask questions and celebrate milestones. Feedback matters as much as votes.",
  },
  {
    n: "03",
    title: "Race the week",
    body: "Every upvote this week pushes your car forward. Positions update live, no refresh needed.",
  },
  {
    n: "04",
    title: "Season resets Monday",
    body: "Results archive to the Hall of Fame, badges are awarded, the champion is crowned, and a fresh grid lines up.",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-mono text-4xl font-semibold sm:text-5xl">
        How it <span className="text-neon">works</span>
      </h1>
      <p className="mt-4 font-mono text-[13px] text-muted-foreground">
        Recognition here doesn't only come from winning. It comes from learning, improving
        and helping other people ship.
      </p>

      <div className="mt-10">
        <SeasonBanner />
      </div>

      <div className="mt-10 border border-border">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-5 border-b border-border p-5 last:border-b-0">
            <span className="font-mono text-2xl font-semibold text-neon">{s.n}</span>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-normal">{s.title}</h2>
              <p className="mt-2 font-mono text-[13px] text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-mono text-sm font-bold tracking-normal">
        Badges you can earn
      </h2>
      <div className="mt-4">
        <AchievementTiles />
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/submit" className="bg-neon px-6 py-3 font-mono text-[13px] font-bold text-ink">
          Submit Project
        </Link>
        <Link
          to="/leaderboard"
          className="bg-ink px-6 py-3 font-mono text-[13px] font-bold text-background"
        >
          Watch the race
        </Link>
      </div>
    </div>
  );
}