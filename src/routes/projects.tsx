import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PROJECTS, CATEGORIES, type Category } from "@/data/community";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Discover Projects — Leaderboard" },
      {
        name: "description",
        content:
          "Browse every project shipped by LearnToEarn builders. Sort by trending, newest, most voted, most commented or recently updated.",
      },
      { property: "og:title", content: "Discover Projects — Leaderboard" },
      {
        property: "og:description",
        content: "Browse every project shipped by LearnToEarn builders and leave feedback.",
      },
    ],
  }),
  component: ProjectsPage,
});

const SORTS = ["Trending", "Newest", "Most Voted", "Most Commented", "Recently Updated"] as const;
type Sort = (typeof SORTS)[number];

function ProjectsPage() {
  const [sort, setSort] = useState<Sort>("Trending");
  const [cat, setCat] = useState<Category | "All">("All");

  const filtered = PROJECTS.filter((p) => cat === "All" || p.category === cat);
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "Newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "Most Voted":
        return b.votes - a.votes;
      case "Most Commented":
        return b.comments.length - a.comments.length;
      case "Recently Updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return b.votes / 10 + b.comments.length - (a.votes / 10 + a.comments.length);
    }
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="font-mono text-4xl font-extrabold uppercase sm:text-5xl">
        Discover <span className="text-neon">Projects</span>
      </h1>
      <p className="mt-4 max-w-2xl font-mono text-[13px] text-muted-foreground">
        Everything the community is building this season. Vote, comment, and tell someone
        what would make their project better.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-border py-3 font-mono text-[12px]">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1.5 ${
              sort === s ? "bg-ink text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wide">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c as Category | "All")}
            className={`border px-3 py-1.5 ${
              cat === c ? "border-neon text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <SectionHeading title={`${sorted.length} Projects`} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p, i) => (
            <ProjectCard key={p.slug} project={p} rank={sort === "Most Voted" ? i + 1 : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}