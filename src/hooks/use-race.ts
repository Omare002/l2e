import { useQuery } from "@tanstack/react-query";
import { leaderboardQuery, weeklyLeaderboardQuery, type LeaderboardRow } from "@/lib/db";
import { currentSeason } from "@/lib/season";

export type RaceScope = "week" | "all";

export type Racer = {
  row: LeaderboardRow;
  votes: number;
  pct: number;
};

/**
 * Race positions come from real accounts only. `scope` picks between the
 * running race week and the all-time board — weekly resets never touch totals.
 */
export function useRace(limit = 8, scope: RaceScope = "all") {
  const season = currentSeason();
  const weekly = useQuery({
    ...weeklyLeaderboardQuery(season.startsAt, season.endsAt),
    enabled: scope === "week",
  });
  const allTime = useQuery({ ...leaderboardQuery(), enabled: scope === "all" });
  const active = scope === "week" ? weekly : allTime;

  const data = (active.data ?? []) as unknown as LeaderboardRow[];
  const rows = data.slice(0, limit);
  const leaderVotes = rows[0]?.score ?? 0;
  const target = Math.max(10, Math.ceil(Math.max(leaderVotes, 1) * 1.25));

  const racers: Racer[] = rows.map((row) => ({
    row,
    votes: row.score ?? 0,
    pct: Math.min(96, ((row.score ?? 0) / target) * 100),
  }));

  return {
    racers,
    leaderVotes,
    target,
    isLoading: active.isLoading,
    isError: active.isError,
    refetch: active.refetch,
    all: data,
    season,
  };
}
