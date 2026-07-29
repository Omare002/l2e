import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BUILDERS, builderBy, projectsBy } from "@/data/community";
import { ProjectCard } from "@/components/project-card";
import { AchievementTiles } from "@/components/achievement-tiles";

export const Route = createFileRoute("/builders/$username")({
  loader: ({ params }) => {
    const b = BUILDERS.find((x) => x.username === params.username);
    if (!b) throw notFound();
    return { username: b.username };
  },
  head: ({ loaderData }) => {
    const b = loaderData ? builderBy(loaderData.username) : undefined;
    if (!b) {
      return {
        meta: [{ title: "Builder not found — Leaderboard" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${b.name} (@${b.username}) — Leaderboard` },
        { name: "description", content: b.bio },
        { property: "og:title", content: `${b.name} (@${b.username}) — Leaderboard` },
        { property: "og:description", content: b.bio },
      ],
    };
  },
  component: BuilderProfile,
});

function ContributionCalendar({ seed }: { seed: number }) {
  const cells = Array.from({ length: 7 * 26 }, (_, i) => (i * seed * 7919) % 11);
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
      {cells.map((v, i) => (
        <span
          key={i}
          className="size-2.5"
          style={{
            background:
              v > 7 ? "#7CFC00" : v > 5 ? "#7CFC0099" : v > 3 ? "#7CFC0044" : "var(--muted)",
          }}
        />
      ))}
    </div>
  );
}

function BuilderProfile() {
  const { username } = Route.useLoaderData();
  const b = builderBy(username)!;
  const projects = projectsBy(username);
  const [following, setFollowing] = useState(false);
  const rank = [...BUILDERS].sort((x, y) => y.totalVotes - x.totalVotes).findIndex(
    (x) => x.username === username,
  ) + 1;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="flex flex-wrap items-start gap-6 border-b border-border pb-10">
        <span
          className="flex size-20 items-center justify-center font-mono text-xl font-bold text-ink"
          style={{ background: b.color }}
        >
          {b.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-3xl font-extrabold uppercase sm:text-4xl">{b.name}</h1>
          <div className="mt-1 font-mono text-[12px] text-muted-foreground">
            @{b.username} · joined {new Date(b.joined).toDateString()}
          </div>
          <p className="mt-4 max-w-2xl font-mono text-[13px] text-foreground/80">{b.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {b.skills.map((s) => (
              <span key={s} className="bg-muted px-2 py-1 font-mono text-[10px] uppercase">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-[12px]">
            <a href={b.github} className="underline underline-offset-4 hover:text-neon">GitHub</a>
            <a href={b.linkedin} className="underline underline-offset-4 hover:text-neon">LinkedIn</a>
            <a href={b.portfolio} className="underline underline-offset-4 hover:text-neon">Portfolio</a>
          </div>
        </div>
        <button
          onClick={() => setFollowing((f) => !f)}
          className={`px-5 py-3 font-mono text-[12px] font-bold ${
            following ? "border border-border" : "bg-neon text-ink"
          }`}
        >
          {following ? "Following" : "Follow builder"}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 border border-border sm:grid-cols-4">
        {[
          ["Weekly Rank", `#${rank}`],
          ["Total Votes", b.totalVotes.toLocaleString()],
          ["Followers", b.followers.toLocaleString()],
          ["Projects", String(projects.length)],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-border px-5 py-5 last:border-r-0">
            <div className="font-mono text-2xl font-bold">{value}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Achievements</h2>
        <div className="mt-4">
          <AchievementTiles keys={b.achievements} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
          Contribution Calendar
        </h2>
        <div className="mt-4 border border-border p-4">
          <ContributionCalendar seed={b.username.length + 3} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Projects</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Recent Activity</h2>
        <ul className="mt-4 divide-y divide-border border border-border">
          {[
            `${b.name} shipped an update to ${projects[0]?.name ?? "a project"}`,
            `${b.name} left feedback on DevMatch`,
            `${b.name} received 12 votes`,
            `${b.name} followed Sam Dev`,
          ].map((line, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 font-mono text-[12px]">
              <span className="size-1.5 bg-neon" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <Link to="/projects" className="font-mono text-[12px] underline underline-offset-4">
          ← Back to projects
        </Link>
      </div>
    </div>
  );
}