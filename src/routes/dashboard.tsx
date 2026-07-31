import { createFileRoute, Link } from "@tanstack/react-router";
import { BUILDERS, PROJECTS } from "@/data/community";
import { AchievementTiles } from "@/components/achievement-tiles";
import { useLiveProjects } from "@/hooks/use-votes";

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

const CARD =
  "rounded-xl border border-border bg-background/60 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
const FIELD =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] normal-case tracking-normal text-foreground outline-none transition-colors duration-200 focus:border-neon";

/** Rank history for the sparkline — lower is better, so the line is inverted. */
const RANK_TREND = [6, 5, 5, 3, 4, 2, 1];

function RankSparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = ((p - min) / span) * 26 + 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <path d={path} fill="none" stroke="var(--neon)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Dashboard() {
  const me = BUILDERS[0];
  const live = useLiveProjects(PROJECTS);
  const mine = live.filter((p) => p.builder === me.username);
  const rank =
    [...live].sort((a, b) => b.votes - a.votes).findIndex((p) => p.builder === me.username) + 1;
  const comments = mine.reduce((n, p) => n + p.comments.length, 0);
  const votes = mine.reduce((n, p) => n + p.votes, 0);
  const activity = mine
    .flatMap((p) => p.comments.map((c) => ({ ...c, project: p.name })))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* Profile overview */}
      <header className="flex flex-wrap items-start justify-between gap-8">
        <div className="flex items-start gap-5">
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-ink"
            style={{ background: me.color }}
            aria-hidden
          >
            {me.initials}
          </span>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight">{me.name}</h1>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">@{me.username}</p>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{me.bio}</p>
          </div>
        </div>
        <Link
          to="/submit"
          className="rounded-full border border-border px-5 py-2.5 text-[13px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-neon hover:bg-muted/60"
        >
          New submission
        </Link>
      </header>

      {/* Standing */}
      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ["Leaderboard position", `#${rank}`],
          ["Total upvotes", votes.toLocaleString()],
          ["Feedback received", String(comments)],
        ].map(([label, value]) => (
          <div key={label} className={`${CARD} px-6 py-6`}>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
            <div className="mt-2 text-[12px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Ranking trend */}
      <section className="mt-6">
        <div className={`${CARD} px-6 py-6`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold tracking-tight">Ranking trend</h2>
            <span className="font-mono text-[11px] text-muted-foreground">Last 7 seasons</span>
          </div>
          <div className="mt-4">
            <RankSparkline points={RANK_TREND} />
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Moved from #{RANK_TREND[0]} to #{RANK_TREND[RANK_TREND.length - 1]}.
          </p>
        </div>
      </section>

      {/* Projects */}
      <section className="mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Submitted projects</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {mine.map((p) => (
            <Link
              key={p.slug}
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className={`${CARD} block px-6 py-5 hover:border-neon hover:bg-muted/40`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium tracking-tight">{p.name}</span>
                <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {p.status}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                {p.tagline}
              </p>
              <div className="mt-4 flex gap-5 font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>{p.votes.toLocaleString()} upvotes</span>
                <span>{p.comments.length} comments</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity */}
      <section className="mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
        <ol className="mt-5 border-l border-border pl-6">
          {activity.map((c) => (
            <li key={c.id} className="relative pb-7 last:pb-0">
              <span className="absolute -left-[27px] top-1.5 size-1.5 rounded-full bg-neon" />
              <div className="text-[13px]">
                <span className="font-medium">@{c.author}</span>{" "}
                <span className="text-muted-foreground">commented on {c.project}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.body}</p>
              <span className="mt-1.5 block font-mono text-[11px] text-muted-foreground/70">
                {c.at}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Achievements */}
      <section className="mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Achievements</h2>
        <div className="mt-5">
          <AchievementTiles keys={me.achievements} />
        </div>
      </section>

      {/* Profile editing */}
      <section className="mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Edit profile</h2>
        <div className={`${CARD} mt-5 grid gap-5 p-6 sm:grid-cols-2`}>
          <label className="text-[12px] text-muted-foreground">
            Display name
            <input defaultValue={me.name} className={FIELD} />
          </label>
          <label className="text-[12px] text-muted-foreground">
            Portfolio
            <input defaultValue={me.portfolio} className={FIELD} />
          </label>
          <label className="text-[12px] text-muted-foreground sm:col-span-2">
            Bio
            <textarea defaultValue={me.bio} rows={3} className={FIELD} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
            >
              Save changes
            </button>
          </div>
        </div>
      </section>

      {/* Account settings */}
      <section className="mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Account</h2>
        <div className={`${CARD} mt-5 divide-y divide-border`}>
          {[
            ["GitHub", `@${me.username}`, "Connected"],
            ["Email", `${me.username}@learntoearn.dev`, "Verified"],
          ].map(([label, value, state]) => (
            <div key={label} className="flex flex-wrap items-center gap-3 px-6 py-5">
              <div>
                <div className="text-[13px] font-medium">{label}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{value}</div>
              </div>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{state}</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 px-6 py-5">
            <div>
              <div className="text-[13px] font-medium">Email notifications</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                Weekly season summary and new feedback.
              </div>
            </div>
            <button
              type="button"
              className="ml-auto rounded-full border border-border px-4 py-2 text-[12px] transition-colors duration-200 hover:border-neon hover:bg-muted/60"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-6 py-5">
            <div>
              <div className="text-[13px] font-medium">Sign out</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                End this session on all tabs.
              </div>
            </div>
            <button
              type="button"
              className="ml-auto rounded-full border border-border px-4 py-2 text-[12px] transition-colors duration-200 hover:border-neon hover:bg-muted/60"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}