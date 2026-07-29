import { COMMUNITY_STATS } from "@/data/community";
import { CountUp } from "./count-up";

export function StatsStrip() {
  return (
    <div className="grid grid-cols-2 border border-border sm:grid-cols-3 lg:grid-cols-5">
      {COMMUNITY_STATS.map((s) => (
        <div
          key={s.label}
          className="border-b border-r border-border px-5 py-6 last:border-r-0 sm:border-b-0"
        >
          <div className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            <CountUp value={s.value} />
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}