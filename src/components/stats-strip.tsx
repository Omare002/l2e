import { useQuery } from "@tanstack/react-query";
import { communityStatsQuery } from "@/lib/db";
import { CountUp } from "./count-up";
import { LoadFailure } from "./skeleton-block";

export function StatsStrip() {
  const { data, isLoading, isError, refetch } = useQuery(communityStatsQuery());
  const stats = data ?? [];

  if (isError) {
    return (
      <div className="rounded-lg border border-border">
        <LoadFailure message="Community stats are unavailable right now." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="glass-panel grid grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-5">
      {(isLoading ? Array.from({ length: 5 }, () => null) : stats).map((s, i) => (
        <div
          key={s?.label ?? i}
          className="border-b border-r border-white/[0.05] px-4 py-7 last:border-r-0 sm:px-6 sm:py-8"
        >
          <div className="text-xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
            {s ? <CountUp value={s.value} /> : <span className="text-muted-foreground">—</span>}
          </div>
          <div className="mt-2 text-[12px] leading-snug text-muted-foreground">
            {s?.label ?? "Loading"}
          </div>
        </div>
      ))}
    </div>
  );

}
