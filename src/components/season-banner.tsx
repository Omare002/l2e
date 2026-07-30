import { useEffect, useState } from "react";
import { SEASON } from "@/data/community";

function remaining() {
  const end = new Date(SEASON.endsAt).getTime();
  const diff = Math.max(0, end - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function SeasonBanner() {
  const [t, setT] = useState(remaining);

  useEffect(() => {
    const id = setInterval(() => setT(remaining()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 rounded-lg border border-border px-6 py-5">
      <div>
        <div className="text-[13px] font-medium">Current season</div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {new Date(SEASON.startsAt).toDateString()} → {new Date(SEASON.endsAt).toDateString()}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-muted-foreground">Resets in</span>
        <span className="font-mono text-[13px] tabular-nums">
          {t.d}d {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
        </span>
      </div>
    </div>
  );
}
