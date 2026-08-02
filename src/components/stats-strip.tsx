import { useQuery } from "@tanstack/react-query";
import { communityStatsQuery } from "@/lib/db";
import { CountUp } from "./count-up";

export function StatsStrip() {
  const { data, isLoading } = useQuery(communityStatsQuery());
  const stats = data ?? [];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {(isLoading ? Array.from({ length: 5 }, () => null) : stats).map((s, i) => (
        <div key={s?.label ?? i} className="bg-background px-4 py-6 sm:px-6 sm:py-7">
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
