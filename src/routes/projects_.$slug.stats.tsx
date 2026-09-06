import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronUp, Eye, MessageSquare } from "lucide-react";
import { getProjectStatsReport } from "@/lib/project-stats.functions";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";

export const Route = createFileRoute("/projects_/$slug/stats")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — project stats · Leaderboard` },
      {
        name: "description",
        content: "Views, upvotes and feedback for this project, with a week-by-week history.",
      },
      { property: "og:title", content: `${params.slug} — project stats` },
      {
        property: "og:description",
        content: "Views, upvotes and feedback for this project, with a week-by-week history.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatsPage,
});

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function StatsPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["project-stats", slug],
    queryFn: () => getProjectStatsReport({ data: { slug } }),
  });

  const peak = Math.max(1, ...(data?.weeks ?? []).map((w) => Math.max(w.views, w.upvotes)));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        to="/projects/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-2 font-mono text-[11px] text-on-dark-muted transition-colors duration-200 hover:text-neon"
      >
        <ArrowLeft className="size-3.5" /> Back to project
      </Link>

      {isLoading ? (
        <div className="mt-8">
          <SkeletonLines lines={6} />
        </div>
      ) : isError ? (
        <div className="mt-8">
          <LoadFailure message="Could not load these stats." onRetry={() => refetch()} />
        </div>
      ) : !data ? (
        <p className="mt-8 text-[13px] text-on-dark-muted">This project could not be found.</p>
      ) : (
        <>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-on-dark sm:text-3xl">
            {data.title}
          </h1>
          <p className="mt-2 text-[13px] text-on-dark-muted">
            How this project has performed, week by week.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Views" value={data.views} icon={<Eye className="size-4" />} />
            <Metric
              label="Upvotes"
              value={data.upvotes}
              icon={<ChevronUp className="size-4" />}
              accent
            />
            <Metric
              label="Feedback"
              value={data.comments}
              icon={<MessageSquare className="size-4" />}
            />
          </div>

          <h2 className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-on-dark-muted">
            Last 12 weeks
          </h2>
          <div className="surface-card mt-4 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] font-mono text-[10px] uppercase tracking-[0.15em] text-on-dark-muted">
                  <th className="px-4 py-3 font-normal">Week of</th>
                  <th className="px-4 py-3 font-normal tabular-nums">Views</th>
                  <th className="px-4 py-3 font-normal tabular-nums">Upvotes</th>
                  <th className="hidden px-4 py-3 font-normal tabular-nums sm:table-cell">
                    Feedback
                  </th>
                  <th className="hidden px-4 py-3 font-normal sm:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody>
                {[...data.weeks].reverse().map((w) => (
                  <tr
                    key={w.week_start}
                    className="border-b border-white/[0.04] font-mono text-[12px] text-on-dark last:border-0"
                  >
                    <td className="px-4 py-3 text-on-dark-muted">{weekLabel(w.week_start)}</td>
                    <td className="px-4 py-3 tabular-nums">{w.views}</td>
                    <td className="px-4 py-3 tabular-nums text-neon">{w.upvotes}</td>
                    <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{w.comments}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className="h-full rounded-full bg-neon/70"
                          style={{ width: `${Math.round((w.views / peak) * 100)}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <div
        className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] ${
          accent ? "text-neon" : "text-on-dark-muted"
        }`}
      >
        {icon} {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-on-dark">
        {value}
      </div>
    </div>
  );
}
