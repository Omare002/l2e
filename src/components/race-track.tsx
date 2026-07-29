import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { useRace } from "@/hooks/use-race";

export function RaceTrack({ compact = false }: { compact?: boolean }) {
  const { racers, target } = useRace();
  const leader = racers[0]?.builder.username;
  const prevLeader = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!leader) return;
    if (prevLeader.current && prevLeader.current !== leader) {
      confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 34,
        origin: { y: 0.4 },
        colors: ["#7CFC00", "#ffffff", "#A5A5A5"],
      });
    }
    prevLeader.current = leader;
  }, [leader]);

  const rows = compact ? racers.slice(0, 6) : racers;

  return (
    <div className="bg-surface-dark p-4 sm:p-6">
      <div className="relative">
        {/* finish line */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 hidden w-3 checker-line opacity-80 sm:block" />

        <div className="flex flex-col">
          {rows.map((r, i) => {
            const pct = Math.min(97, (r.votes / target) * 100);
            const isLeader = i === 0;
            return (
              <motion.div
                key={r.builder.username}
                layout
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
                className="flex items-center gap-3 border-b border-white/5 py-2 last:border-b-0"
              >
                <div className="flex w-[42%] shrink-0 items-center gap-3 sm:w-[30%]">
                  <span
                    className={`w-4 text-right font-mono text-xs ${
                      isLeader ? "text-neon" : "text-white/40"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="flex size-7 shrink-0 items-center justify-center font-mono text-[10px] font-bold text-ink"
                    style={{ background: r.builder.color }}
                  >
                    {r.builder.initials}
                  </span>
                  <Link
                    to="/builders/$username"
                    params={{ username: r.builder.username }}
                    className="min-w-0"
                  >
                    <div className="truncate font-mono text-[13px] font-bold text-white">
                      {r.builder.name}
                    </div>
                    <div className="truncate font-mono text-[11px] text-white/40">
                      {r.project?.name ?? `@${r.builder.username}`}
                    </div>
                  </Link>
                </div>

                {/* lane */}
                <div className="relative h-8 flex-1 border-b border-dashed border-white/10">
                  <div className="absolute left-0 top-0 bottom-0 w-2 checker-line opacity-70" />
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2"
                    animate={{ left: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 18 }}
                  >
                    <div className="relative">
                      {r.accelerating && (
                        <>
                          <span
                            className="absolute right-full top-1/2 size-2 -translate-y-1/2 rounded-full bg-white/50"
                            style={{ animation: "smoke-puff 700ms ease-out forwards" }}
                          />
                          <span className="absolute right-full top-1/2 h-px w-6 -translate-y-1/2 bg-neon/60" />
                        </>
                      )}
                      <span
                        className="block px-2 py-0.5 font-mono text-[10px] font-bold text-ink"
                        style={{
                          background: r.builder.color,
                          boxShadow: isLeader ? "0 0 18px -2px #7CFC00" : undefined,
                        }}
                      >
                        {i + 1}
                      </span>
                    </div>
                  </motion.div>
                </div>

                <div className="hidden w-32 shrink-0 pr-5 text-right font-mono text-[11px] sm:block">
                  <div className="text-neon">▲ {r.votes}</div>
                  <div className="text-white/35">
                    {Math.max(0, target - r.votes)} to finish
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