import { createFileRoute, Link } from "@tanstack/react-router";
import { HALL_OF_FAME, builderBy } from "@/data/community";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Leaderboard" },
      {
        name: "description",
        content: "Every weekly champion of the LearnToEarn race, their winning project, votes and prize.",
      },
      { property: "og:title", content: "Hall of Fame — Leaderboard" },
      {
        property: "og:description",
        content: "Every weekly champion of the LearnToEarn race and their winning project.",
      },
    ],
  }),
  component: HallOfFame,
});

function HallOfFame() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-mono text-4xl font-semibold sm:text-5xl">
        Hall of <span className="text-neon">Fame</span>
      </h1>
      <p className="mt-4 max-w-2xl font-mono text-[13px] text-muted-foreground">
        Archived seasons. Every champion, every winning build, every badge earned.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {HALL_OF_FAME.map((w) => {
          const b = builderBy(w.winner);
          return (
            <article key={w.week} className="bg-surface-dark p-5">
              <div className="flex items-center justify-between font-mono text-[11px] tracking-normal text-white/40">
                <span>Week {w.week}</span>
                <span className="bg-neon px-2 py-1 text-ink">{w.badge}</span>
              </div>
              <div
                className="mt-4 h-28 border border-white/10"
                style={{
                  background: `repeating-linear-gradient(135deg, ${w.tone}22 0 8px, transparent 8px 16px)`,
                }}
                aria-hidden
              />
              <h2 className="mt-4 font-mono text-lg font-bold text-white">{w.project}</h2>
              <Link
                to="/builders/$username"
                params={{ username: w.winner }}
                className="mt-1 block font-mono text-[12px] text-white/50 hover:text-neon"
              >
                {b?.name} · @{w.winner}
              </Link>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px]">
                <span className="text-neon">▲ {w.votes} votes</span>
                <span className="text-white/45">{w.prize}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}