import { useMemo } from "react";
import { BUILDERS, PROJECTS, type Builder, type Project } from "@/data/community";
import { useVotes } from "@/hooks/use-votes";

export type Racer = {
  builder: Builder;
  project: Project;
  votes: number;
  accelerating: boolean;
};

/**
 * Live race positions. Votes come from the shared vote store, so a click on any
 * upvote button re-orders the track instantly. Phase 2 swaps the store for a
 * realtime subscription — this shape stays identical.
 */
export function useRace() {
  const { votes, accelerating } = useVotes();

  const racers = useMemo<Racer[]>(() => {
    return BUILDERS.map((builder) => {
      const project = PROJECTS.find((p) => p.builder === builder.username)!;
      return {
        builder,
        project,
        votes: votes[project?.slug] ?? 0,
        accelerating: accelerating === project?.slug,
      };
    }).sort((a, b) => b.votes - a.votes);
  }, [votes, accelerating]);

  const leaderVotes = racers[0]?.votes ?? 1;
  const target = Math.max(600, Math.ceil(leaderVotes / 100) * 100);

  return { racers, leaderVotes, target };
}
