import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProjectCard } from "@/components/project-card";
import { AchievementTiles } from "@/components/achievement-tiles";
import { earnedAchievements } from "@/data/community";
import { leaderboardQuery, profileQuery, projectsQuery, userActivityQuery } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";
import { ACTIVITY_LABELS, relativeTime } from "@/lib/display";

export const Route = createFileRoute("/builders/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Leaderboard` },
      { name: "description", content: `Projects, upvotes and race position for @${params.username}.` },
      { property: "og:title", content: `@${params.username} — Leaderboard` },
      {
        property: "og:description",
        content: `Projects, upvotes and race position for @${params.username}.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderProfile,
});

function BuilderProfile() {
  const { username } = Route.useParams();
  const { data: profile, isLoading } = useQuery(profileQuery(username));
  const { data: leaders } = useQuery(leaderboardQuery());
  const { data: projects } = useQuery(projectsQuery("Most Voted", "All", 48));
  const { data: activity } = useQuery({
    ...userActivityQuery(profile?.id ?? ""),
    enabled: Boolean(profile?.id),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-[13px] text-muted-foreground sm:px-6">Loading profile…</div>;
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Builder not found</h1>
        <Link to="/projects" className="mt-6 inline-block text-[13px] underline underline-offset-4">
          Back to projects
        </Link>
      </div>
    );
  }

  const row = (leaders ?? []).find((l) => l.id === profile.id);
  const mine = (projects ?? []).filter((p) => p.owner_id === profile.id);
  const votes = row?.score ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="grid gap-6 border-b border-border pb-10 sm:grid-cols-[auto_minmax(0,1fr)]">
        <UserAvatar
          name={profile.display_name}
          path={profile.avatar_url}
          accent={profile.accent_color}
          size={72}
          eager
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{profile.display_name}</h1>
          <div className="mt-1 font-mono text-[12px] text-muted-foreground">
            @{profile.username} · joined {new Date(profile.created_at).toDateString()}
          </div>
          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-5 font-mono text-[12px]">
            {profile.github_url ? (
              <a href={profile.github_url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-neon">
                GitHub
              </a>
            ) : null}
            {profile.portfolio_url ? (
              <a href={profile.portfolio_url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-neon">
                Portfolio
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {[
          ["Rank", row?.rank ? `#${row.rank}` : "—"],
          ["Upvotes received", votes.toLocaleString()],
          ["Projects", String(mine.length)],
        ].map(([label, value]) => (
          <div key={label} className="bg-background px-5 py-5">
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold tracking-tight">Achievements</h2>
        <div className="mt-4">
          <AchievementTiles
            keys={earnedAchievements({
              projectCount: mine.length,
              score: votes,
              rank: row?.rank ?? null,
            })}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold tracking-tight">Projects</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {mine.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
        {mine.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No published projects yet.</p>
        ) : null}
      </section>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
        <ul className="mt-5 divide-y divide-border rounded-lg border border-border">
          {(activity ?? []).length === 0 ? (
            <li className="px-4 py-6 text-[13px] text-muted-foreground sm:px-5">Nothing yet.</li>
          ) : (
            (activity ?? []).map((a) => (
              <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3.5 text-[13px] sm:px-5">
                <span className="min-w-0 truncate">
                  {ACTIVITY_LABELS[a.type] ?? a.type} {a.project?.title ?? ""}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {relativeTime(a.created_at)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
