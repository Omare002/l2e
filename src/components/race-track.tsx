import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RaceCar } from "@/components/race-car";
import { useRace } from "@/hooks/use-race";
import { useAuth } from "@/hooks/use-auth";
import { LoadFailure } from "@/components/skeleton-block";

const EASE = [0.22, 1, 0.36, 1] as const;

export function RaceTrack({ compact = false }: { compact?: boolean }) {
  const { racers, target, isLoading, isError, refetch } = useRace(compact ? 6 : 10);
  const { userId } = useAuth();

  if (isLoading && racers.length === 0) {
    return (
      <div className="surface-card px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-3">
          {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <div
              key={i}
              className="h-7 animate-pulse rounded bg-white/[0.05]"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError && racers.length === 0) {
    return (
      <div className="surface-card">
        <LoadFailure message="The race couldn't load just now." onRetry={() => refetch()} />
      </div>
    );
  }

  if (racers.length === 0) {
    return (
      <div className="surface-card px-6 py-10 text-center text-[13px] text-white/55">
        No racers yet — the first published project starts the race.
      </div>
    );
  }

  return (
    <div className="surface-card px-4 py-5 sm:px-8 sm:py-8">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px finish-line opacity-70 sm:right-28 sm:block" />

        <div className="flex flex-col gap-1">
          {racers.map((r, i) => {
            const isLeader = i === 0;
            const isMe = r.row.id === userId;
            return (
              <motion.div
                key={r.row.id ?? i}
                layout
                transition={{ duration: 0.55, ease: EASE }}
                className={`group flex items-center gap-3 rounded-md px-2 py-3 transition-colors duration-300 hover:bg-white/[0.03] sm:gap-4 ${
                  isMe ? "bg-white/[0.05]" : ""
                }`}
              >
                <div className="flex w-[52%] shrink-0 items-center gap-2.5 sm:w-[26%] sm:gap-3">
                  <span
                    className={`w-4 shrink-0 text-right font-mono text-[11px] tabular-nums ${
                      isLeader ? "text-neon" : "text-white/35"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Link
                    to="/builders/$username"
                    params={{ username: r.row.username ?? "" }}
                    className="min-w-0"
                  >
                    <div className="truncate text-[13px] font-medium text-white transition-colors duration-200 group-hover:text-neon">
                      {r.row.display_name}
                      {isMe ? <span className="ml-2 font-mono text-[10px] text-neon">you</span> : null}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-white/40">
                      {r.row.top_project_title ?? `@${r.row.username}`}
                    </div>
                  </Link>
                </div>

                <div className="relative h-7 flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.07]" />
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 will-change-transform"
                    animate={{ left: `${r.pct}%` }}
                    transition={{ duration: 1, ease: EASE }}
                  >
                    <div className="relative -translate-x-1/2">
                      <RaceCar
                        color={isLeader ? "var(--neon)" : r.row.accent_color ?? "#A5A5A5"}
                        className="h-3.5 w-8 opacity-90 sm:h-4 sm:w-10"
                      />
                    </div>
                  </motion.div>
                </div>

                <div className="hidden w-28 shrink-0 pr-4 text-right sm:block">
                  <div className="font-mono text-[12px] tabular-nums text-white/85">
                    {r.votes.toLocaleString()}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-white/30">
                    {Math.max(0, target - r.votes)} to go
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[12px] tabular-nums text-white/70 sm:hidden">
                  {r.votes.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
