import { createFileRoute, Link } from "@tanstack/react-router";
import { BUILDERS, PROJECTS, projectsBy } from "@/data/community";
import { AchievementTiles } from "@/components/achievement-tiles";
import { SectionHeading } from "@/components/section-heading";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — Leaderboard" },
      {
        name: "description",
        content: "Manage your projects, track votes and feedback, and watch your race position.",
      },
      { property: "og:title", content: "Your Dashboard — Leaderboard" },
      {
        property: "og:description",
        content: "Manage your projects, track votes and feedback, and watch your race position.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = BUILDERS[0];
  const mine = projectsBy(me.username);
  const rank =
    [...PROJECTS].sort((a, b) => b.votes - a.votes).findIndex((p) => p.builder === me.username) + 1;
  const comments = mine.reduce((n, p) => n + p.comments.length, 0);
  const votes = mine.reduce((n, p) => n + p.votes, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-4xl font-semibold sm:text-5xl">Dashboard</h1>
          <p className="mt-3 font-mono text-[13px] text-muted-foreground">
            Signed in as {me.name} · @{me.username}
          </p>
        </div>
        <Link to="/submit" className="bg-neon px-5 py-3 font-mono text-[12px] font-bold text-ink">
          New submission
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-2 rounded-lg border border-border sm:grid-cols-4">
        {[
          ["Race Position", `#${rank}`],
          ["Weekly Votes", votes.toLocaleString()],
          ["Feedback Received", String(comments)],
          ["Followers", me.followers.toLocaleString()],
        ].map(([l, v]) => (
          <div key={l} className="border-r border-border px-5 py-5 last:border-r-0">
            <div className="font-mono text-2xl font-bold">{v}</div>
            <div className="mt-1 font-mono text-[11px] tracking-normal text-muted-foreground">
              {l}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <SectionHeading title="My Projects" subtitle="Edit details, track votes, read feedback." />
        <div className="rounded-lg border border-border">
          {mine.map((p) => (
            <div
              key={p.slug}
              className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4 font-mono text-[12px] last:border-b-0"
            >
              <Link
                to="/projects/$slug"
                params={{ slug: p.slug }}
                className="font-bold hover:text-neon"
              >
                {p.name}
              </Link>
              <span className="bg-muted px-2 py-1 text-[10px]">{p.status}</span>
              <span className="ml-auto text-muted-foreground">▲ {p.votes} votes</span>
              <span className="text-muted-foreground">{p.comments.length} comments</span>
              <button className="rounded-lg border border-border px-3 py-1.5">Edit</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading title="Recent Feedback" />
        <ul className="divide-y divide-border rounded-lg border border-border">
          {mine.flatMap((p) =>
            p.comments.map((c) => (
              <li key={c.id} className="px-4 py-4 font-mono text-[12px]">
                <span className="font-bold">@{c.author}</span>{" "}
                <span className="text-muted-foreground">on {p.name} · {c.at}</span>
                <p className="mt-1 text-foreground/80">{c.body}</p>
              </li>
            )),
          )}
        </ul>
      </section>

      <section className="mt-12">
        <SectionHeading title="My Achievements" />
        <AchievementTiles keys={me.achievements} />
      </section>

      <section className="mt-12">
        <SectionHeading title="Profile" subtitle="Keep it current — builders check it." />
        <div className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2">
          <label className="font-mono text-[11px] tracking-normal text-muted-foreground">
            Display name
            <input
              defaultValue={me.name}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] normal-case tracking-normal text-foreground outline-none focus:border-neon"
            />
          </label>
          <label className="font-mono text-[11px] tracking-normal text-muted-foreground">
            Portfolio
            <input
              defaultValue={me.portfolio}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] normal-case tracking-normal text-foreground outline-none focus:border-neon"
            />
          </label>
          <label className="font-mono text-[11px] tracking-normal text-muted-foreground sm:col-span-2">
            Bio
            <textarea
              defaultValue={me.bio}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] normal-case tracking-normal text-foreground outline-none focus:border-neon"
            />
          </label>
          <div>
            <button className="bg-ink px-5 py-2.5 font-mono text-[12px] font-bold text-background">
              Save profile
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}