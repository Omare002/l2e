import { useQuery } from "@tanstack/react-query";
import { leaderboardQuery, type LeaderboardRow } from "@/lib/db";

export type Racer = {
  row: LeaderboardRow;
  votes: number;
  pct: number;
};

/**
 * Race positions come straight from the leaderboard view, so every car on the
 * track is a real account (or a clearly labelled demo account).
 */
export function useRace(limit = 8) {
  const { data, isLoading } = useQuery(leaderboardQuery());
  const rows = (data ?? []).slice(0, limit);
  const leaderVotes = rows[0]?.score ?? 0;
  const target = Math.max(10, Math.ceil(Math.max(leaderVotes, 1) * 1.25));

  const racers: Racer[] = rows.map((row) => ({
    row,
    votes: row.score ?? 0,
    pct: Math.min(96, ((row.score ?? 0) / target) * 100),
  }));

  return { racers, leaderVotes, target, isLoading, all: data ?? [] };
}
