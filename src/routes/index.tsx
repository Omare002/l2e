import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsStrip } from "@/components/stats-strip";
import { RaceTrack } from "@/components/race-track";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { ActivityFeed } from "@/components/activity-feed";
import { TypingHeadline } from "@/components/typing-headline";
import { projectsQuery } from "@/lib/db";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<"Trending" | "Newest">("Trending");
  const { data, isLoading } = useQuery(projectsQuery(tab, "All", 4));
  const list = data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="flex flex-col items-center pt-20 pb-14 text-center sm:pt-32 sm:pb-20">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
          THE LEARNTOEARN SHOWCASE
        </span>
        <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          <TypingHeadline />
        </h1>
        <p className="mt-6 max-w-xl text-balance text-[14px] leading-relaxed text-muted-foreground sm:mt-7 sm:text-[15px]">
          A quiet, well-made home for what the LearnToEarn community is building. Showcase your
          work, gather real feedback, and follow the weekly race as it unfolds.
        </p>
        <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
          <Link
            to="/projects"
            className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            Explore projects
          </Link>
          <Link
            to="/submit"
            className="flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-[14px] font-medium transition-colors duration-200 hover:border-neon hover:bg-muted/60"
          >
            Submit a project
          </Link>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <SectionHeading
          title="This week's race"
          subtitle="Every upvote nudges a builder forward. The track settles as the week goes on."
          right={
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-neon" /> Live
            </span>
          }
        />
        <RaceTrack compact />
        <div className="mt-4 text-right">
          <Link
            to="/leaderboard"
            className="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-neon"
          >
            View full leaderboard →
          </Link>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <StatsStrip />
      </section>

      <section className="pb-16 sm:pb-20">
        <SectionHeading
          title="Latest builds"
          right={
            <div className="flex gap-1 rounded-full border border-border p-1 text-[12px]">
              {(["Trending", "Newest"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`min-h-9 rounded-full px-3.5 transition-colors duration-200 ${
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
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
            No projects published yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((p, i) => (
              <ProjectCard key={p.id} project={p} rank={tab === "Trending" ? i + 1 : undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="pb-6">
        <SectionHeading title="Community feed" subtitle="What's happening right now." />
        <ActivityFeed />
      </section>
    </div>
  );
}
