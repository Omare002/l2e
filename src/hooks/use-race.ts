import { useEffect, useMemo, useState } from "react";
import { BUILDERS, PROJECTS, type Builder, type Project } from "@/data/community";

export type Racer = {
  builder: Builder;
  project: Project;
  votes: number;
  accelerating: boolean;
};

const BASE: Record<string, number> = Object.fromEntries(
  BUILDERS.map((b) => {
    const p = PROJECTS.find((x) => x.builder === b.username);
    return [b.username, p?.votes ?? 20];
  }),
);

/**
 * Phase 1: simulated live vote stream. Phase 2 swaps this for a realtime
 * subscription — the returned shape stays identical.
 */
export function useRace(live = true) {
  const [votes, setVotes] = useState<Record<string, number>>(BASE);
  const [accel, setAccel] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const pool = BUILDERS.map((b) => b.username);
      const who = pool[Math.floor(Math.random() * pool.length)];
      const bump = 1 + Math.floor(Math.random() * 14);
      setVotes((v) => ({ ...v, [who]: (v[who] ?? 0) + bump }));
      setAccel(who);
      setTimeout(() => setAccel(null), 900);
    }, 2600);
    return () => clearInterval(id);
  }, [live]);

  const racers = useMemo<Racer[]>(() => {
    return BUILDERS.map((builder) => {
      const project = PROJECTS.find((p) => p.builder === builder.username)!;
      return {
        builder,
        project,
        votes: votes[builder.username] ?? 0,
        accelerating: accel === builder.username,
      };
    }).sort((a, b) => b.votes - a.votes);
  }, [votes, accel]);

  const leaderVotes = racers[0]?.votes ?? 1;
  const target = Math.max(600, Math.ceil(leaderVotes / 100) * 100);

  return { racers, leaderVotes, target };
}