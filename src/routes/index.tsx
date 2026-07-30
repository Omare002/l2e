import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PROJECTS } from "@/data/community";
import { StatsStrip } from "@/components/stats-strip";
import { RaceTrack } from "@/components/race-track";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { ActivityFeed } from "@/components/activity-feed";
import { useLiveProjects } from "@/hooks/use-votes";
import { TypingHeadline } from "@/components/typing-headline";

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
    <div className="mx-auto max-w-6xl px-6">
      <section className="pt-20 pb-12 sm:pt-28">
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          <TypingHeadline />
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          A quiet, well-made home for what the LearnToEarn community is building. Showcase
          your work, gather real feedback, and follow the weekly race as it unfolds.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/projects"
            className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-all duration-300 hover:shadow-[0_0_0_3px_var(--neon-dim)]"
          >
            Explore projects
          </Link>
          <Link
            to="/submit"
            className="rounded-full border border-border px-5 py-2.5 text-[13px] font-medium transition-all duration-300 hover:border-neon/60 hover:shadow-[0_0_0_3px_var(--neon-dim)]"
          >
            Submit a project
          </Link>
        </div>
      </section>

      <section className="pb-20">
        <SectionHeading
          title="This week's race"
          subtitle="Every upvote nudges a builder forward. The track settles as the week goes on."
          right={
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-neon" /> Live
            </span>
          }
        />
        <RaceTrack />
        <div className="mt-4 text-right">
          <Link
            to="/leaderboard"
            className="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-neon"
          >
            View full leaderboard →
          </Link>
        </div>
      </section>

      <section className="pb-20">
        <StatsStrip />
      </section>

      <section className="pb-20">
        <SectionHeading
          title="Latest builds"
          right={
            <div className="flex gap-1 rounded-full border border-border p-1 text-[12px]">
              {(["trending", "new"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3.5 py-1.5 capitalize transition-all duration-300 ${
                    tab === t
                      ? "bg-neon-dim text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid gap-6 md:grid-cols-2">
          {list.slice(0, 4).map((p, i) => (
            <ProjectCard key={p.slug} project={p} rank={tab === "trending" ? i + 1 : undefined} />
          ))}
        </div>
      </section>

      <section className="pb-6">
        <SectionHeading title="Community feed" subtitle="What's happening right now." />
        <ActivityFeed />
      </section>
    </div>
  );
}
