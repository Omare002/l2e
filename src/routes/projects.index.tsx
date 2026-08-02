import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/data/community";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { PROJECT_SORTS, projectsQuery, type ProjectSort } from "@/lib/db";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Discover projects — Leaderboard" },
      {
        name: "description",
        content:
          "Browse every project shipped by LearnToEarn builders. Sort by trending, newest, most voted, most commented or recently updated.",
      },
      { property: "og:title", content: "Discover projects — Leaderboard" },
      {
        property: "og:description",
        content: "Browse every project shipped by LearnToEarn builders and leave feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [sort, setSort] = useState<ProjectSort>("Trending");
  const [cat, setCat] = useState<string>("All");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery(projectsQuery(sort, cat, 48));

  const list = (data ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (p.title ?? "").toLowerCase().includes(q) ||
      (p.tagline ?? "").toLowerCase().includes(q) ||
      (p.tech ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        Discover <span className="text-neon">projects</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        Everything the community is building this season. Vote, comment, and tell someone what
        would make their project better.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects, taglines or tech…"
        className="mt-8 min-h-12 w-full rounded-full border border-border bg-background px-5 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
      />

      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-2 border-y border-border py-2.5 text-[12px]">
          {PROJECT_SORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`min-h-10 whitespace-nowrap rounded-full px-3.5 transition-colors duration-200 ${
                sort === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 font-mono text-[11px]">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as string)}
              className={`min-h-10 whitespace-nowrap rounded-full border px-3.5 transition-colors duration-200 ${
                cat === c ? "border-neon text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <SectionHeading title={isLoading ? "Loading projects" : `${list.length} projects`} />
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
            Nothing matches that yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                rank={sort === "Most Voted" ? i + 1 : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
