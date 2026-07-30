import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { RaceCar } from "@/components/race-car";
import { useRace } from "@/hooks/use-race";

const EASE = [0.22, 1, 0.36, 1] as const;

export function RaceTrack({ compact = false }: { compact?: boolean }) {
  const { racers, target } = useRace();
  const rows = compact ? racers.slice(0, 6) : racers;

  return (
    <div className="surface-card px-5 py-6 sm:px-8 sm:py-8">
      <div className="relative">
        {/* finish line */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px finish-line opacity-70 sm:block" />

        <div className="flex flex-col gap-1">
          {rows.map((r, i) => {
            const pct = Math.min(96, (r.votes / target) * 100);
            const isLeader = i === 0;
            return (
              <motion.div
                key={r.builder.username}
                layout
                transition={{ duration: 0.55, ease: EASE }}
                className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors duration-300 hover:bg-white/[0.03]"
              >
                <div className="flex w-[46%] shrink-0 items-center gap-3 sm:w-[26%]">
                  <span
                    className={`w-4 text-right font-mono text-[11px] tabular-nums ${
                      isLeader ? "text-neon" : "text-white/35"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Link
                    to="/builders/$username"
                    params={{ username: r.builder.username }}
                    className="min-w-0"
                  >
                    <div className="truncate text-[13px] font-medium text-white transition-colors duration-200 group-hover:text-neon">
                      {r.builder.name}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-white/40">
                      {r.project?.name ?? `@${r.builder.username}`}
                    </div>
                  </Link>
                </div>

                {/* lane */}
                <div className="relative h-7 flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.07]" />
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2"
                    animate={{ left: `${pct}%` }}
                    transition={{ duration: 1.1, ease: EASE }}
                  >
                    <div className="relative -translate-x-1/2">
                      <motion.span
                        className="pointer-events-none absolute right-[85%] top-1/2 h-px w-10 -translate-y-1/2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(to left, color-mix(in oklab, var(--neon) 65%, transparent), transparent)",
                        }}
                        animate={{ opacity: r.accelerating ? 1 : 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                      />
                      <RaceCar
                        color={isLeader ? "var(--neon)" : r.builder.color}
                        className="h-4 w-10 opacity-90"
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
