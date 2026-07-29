import { useEffect, useState } from "react";
import { SEASON } from "@/data/community";

function remaining() {
  const end = new Date(SEASON.endsAt).getTime();
  const diff = Math.max(0, end - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export function SeasonBanner() {
  const [t, setT] = useState(remaining);

  useEffect(() => {
    const id = setInterval(() => setT(remaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-border px-5 py-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Season · Week {SEASON.week} · {SEASON.year}
        </div>
        <div className="mt-1 font-mono text-[12px] text-muted-foreground">
          {new Date(SEASON.startsAt).toDateString()} → {new Date(SEASON.endsAt).toDateString()}
        </div>
      </div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Ends in
        </span>
        <span className="bg-ink px-3 py-2 text-sm font-bold text-neon tabular-nums">
          {t.d}d {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
        </span>
      </div>
    </div>
  );
}