import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, toggleVote } from "@/lib/vote-store";
import type { Project } from "@/data/community";

export function useVotes() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...state,
    toggle: toggleVote,
    voteCount: (slug: string) => state.votes[slug] ?? 0,
    hasVoted: (slug: string) => state.myVotes[slug] === true,
  };
}

/** Convenience: projects with live vote counts merged in. */
export function useLiveProjects(projects: Project[]): Project[] {
  const { votes } = useVotes();
  return projects.map((p) => ({ ...p, votes: votes[p.slug] ?? p.votes }));
}
