import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PROJECTS, SEASON } from "@/data/community";
import { StatsStrip } from "@/components/stats-strip";
import { RaceTrack } from "@/components/race-track";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { ActivityFeed } from "@/components/activity-feed";
import { useLiveProjects } from "@/hooks/use-votes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leaderboard — LearnToEarn Project Showcase" },
      {
        name: "description",
        content:
          "Showcase what you're building, get real feedback, discover community projects, and race up the weekly LearnToEarn leaderboard.",
      },
      { property: "og:title", content: "Leaderboard — LearnToEarn Project Showcase" },
      {
        property: "og:description",
        content:
          "Build, share, climb. The weekly project showcase and live race track for the LearnToEarn Fellowship.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<"trending" | "new">("trending");
  const live = useLiveProjects(PROJECTS);
  const list = [...live].sort((a, b) =>
    tab === "trending"
      ? b.votes - a.votes
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="pt-16 pb-14 text-center sm:pt-24">
        <span className="inline-block bg-neon-dim px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
          Week {SEASON.week} · {SEASON.year}
        </span>
        <h1 className="mx-auto mt-7 max-w-4xl font-mono text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">
          Build.{" "}
          <span className="text-muted-foreground">Share.</span>{" "}
          <span className="text-neon">Climb.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-mono text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          A place to showcase what you're building, receive feedback, discover amazing
          projects, and climb the community leaderboard.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/projects"
            className="bg-ink px-6 py-3 font-mono text-[13px] font-bold text-background transition-transform hover:-translate-y-0.5"
          >
            Explore Projects
          </Link>
          <Link
            to="/submit"
            className="bg-neon px-6 py-3 font-mono text-[13px] font-bold text-ink transition-transform hover:-translate-y-0.5"
          >
            Submit Project
          </Link>
        </div>

        <div className="mt-14 text-left">
          <StatsStrip />
        </div>
      </section>

      <section className="pb-16">
        <SectionHeading
          title="Top Racers This Week"
          subtitle="Every upvote pushes a car forward. Click a builder to view their profile."
          right={
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="size-1.5 animate-pulse bg-neon" /> Live Race
            </span>
          }
        />
        <RaceTrack />
        <div className="mt-3 text-right">
          <Link
            to="/leaderboard"
            className="font-mono text-[12px] underline underline-offset-4 hover:text-neon"
          >
            View full leaderboard →
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <SectionHeading
          title="Latest Builds"
          right={
            <div className="flex gap-4 font-mono text-[12px]">
              <button
                onClick={() => setTab("trending")}
                className={
                  tab === "trending"
                    ? "border-b-2 border-neon pb-0.5 font-bold"
                    : "text-muted-foreground"
                }
              >
                Trending
              </button>
              <button
                onClick={() => setTab("new")}
                className={
                  tab === "new"
                    ? "border-b-2 border-neon pb-0.5 font-bold"
                    : "text-muted-foreground"
                }
              >
                New
              </button>
            </div>
          }
        />
        <div className="grid gap-5 md:grid-cols-2">
          {list.slice(0, 4).map((p, i) => (
            <ProjectCard key={p.slug} project={p} rank={tab === "trending" ? i + 1 : undefined} />
          ))}
        </div>
      </section>

      <section className="pb-4">
        <SectionHeading title="Community Feed" subtitle="What's happening right now." />
        <ActivityFeed />
      </section>
    </div>
  );
}
