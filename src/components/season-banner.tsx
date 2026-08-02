import { useEffect, useState } from "react";
import { currentSeason } from "@/data/community";

function remaining(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function SeasonBanner() {
  const season = currentSeason();
  const [t, setT] = useState(() => remaining(season.endsAt));

  useEffect(() => {
    const id = setInterval(() => setT(remaining(season.endsAt)), 1000);
    return () => clearInterval(id);
  }, [season.endsAt]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="grid gap-4 rounded-lg border border-border px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">Current season</div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {new Date(season.startsAt).toDateString()} → {new Date(season.endsAt).toDateString()}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <span className="text-[12px] text-muted-foreground">Resets in</span>
        <span className="font-mono text-[13px] tabular-nums">
          {t.d}d {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
        </span>
      </div>
    </div>
  );
}
