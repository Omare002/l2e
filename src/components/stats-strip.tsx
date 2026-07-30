import { COMMUNITY_STATS } from "@/data/community";
import { CountUp } from "./count-up";

export function StatsStrip() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {COMMUNITY_STATS.map((s) => (
        <div key={s.label} className="bg-background px-6 py-7">
          <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
            <CountUp value={s.value} />
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
