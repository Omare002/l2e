import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { leaderboardQuery, projectsQuery } from "@/lib/db";
import { initialsOf } from "@/lib/display";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of fame — Leaderboard" },
      {
        name: "description",
        content:
          "The all-time top builders and most upvoted projects of the LearnToEarn community.",
      },
      { property: "og:title", content: "Hall of fame — Leaderboard" },
      {
        property: "og:description",
        content: "All-time top builders and most upvoted projects of the LearnToEarn community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HallOfFame,
});

function HallOfFame() {
  const { data: leaders } = useQuery(leaderboardQuery());
  const { data: projects } = useQuery(projectsQuery("Most Voted", "All", 6));
  const top = (leaders ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        Hall of <span className="text-neon">fame</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        All-time standing, straight from community votes: the builders on the podium and the
        projects the community backed most.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {top.map((r, i) => (
          <article key={r.id} className="surface-card lift-hover p-6">
            <div className="font-mono text-[13px] text-card-muted">
              {["First", "Second", "Third"][i]} place
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold text-ink"
                style={{ background: r.accent_color ?? "var(--neon)" }}
              >
                {initialsOf(r.display_name)}
              </span>
              <Link
                to="/builders/$username"
                params={{ username: r.username ?? "" }}
                className="min-w-0"
              >
                <div className="truncate text-lg font-semibold text-card-foreground">{r.display_name}</div>
                <div className="truncate font-mono text-[13px] text-card-muted">@{r.username}</div>
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4 font-mono text-[13px]">
              <span className="text-neon">▲ {(r.score ?? 0).toLocaleString()} votes</span>
              <span className="text-card-muted">{r.project_count ?? 0} projects</span>
            </div>
          </article>
        ))}
      </div>

      <h2 className="mt-16 text-xl font-semibold tracking-tight sm:text-2xl">Most backed projects</h2>
      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        {(projects ?? []).map((p, i) => (
          <Link
            key={p.id}
            to="/projects/$slug"
            params={{ slug: p.slug ?? "" }}
            className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-4 text-[13px] transition-colors duration-200 last:border-b-0 hover:bg-muted/50 sm:px-5"
          >
            <span className="font-mono tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.title}</span>
              <span className="block truncate font-mono text-[13px] text-muted-foreground">
                @{p.owner_username}
              </span>
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">
              ▲ {(p.vote_count ?? 0).toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
