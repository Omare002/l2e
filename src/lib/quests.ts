import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getMyQuestEntry,
  getMyQuestHistory,
  getMyQuests,
  getPublicQuest,
  getPublicQuests,
  getWeeklyTasks,
} from "@/lib/quests.functions";

export type QuestKind = "shared_task" | "challenge" | "group";

export const QUEST_KIND_LABEL: Record<QuestKind, string> = {
  shared_task: "Shared weekly task",
  challenge: "Direct challenge",
  group: "Group challenge",
};

export type QuestListRow = {
  id: string;
  title: string;
  description: string;
  kind: string;
  ends_at: string;
  closed_at: string | null;
  winner_votes: number | null;
  creator: { username: string; display_name: string; avatar_url: string | null; accent_color: string } | null;
  winner: { username: string; display_name: string } | null;
  task: { title: string } | null;
  participants: { status: string }[] | null;
};

export type QuestStanding = {
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  status: string;
  project_title: string | null;
  project_slug: string | null;
  votes: number;
};

export type QuestEntry = { status: string; project_id: string | null } | null;

export type QuestHistoryRow = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  closed_at: string | null;
  winner_votes: number | null;
  winner: { username: string; display_name: string } | null;
  task: { title: string } | null;
  participants: { status: string }[] | null;
  my_status: string;
  submitted: boolean;
};

export type QuestDetail = {
  quest: QuestListRow & {
    starts_at: string;
    task: { title: string; prompt: string } | null;
  };
  standings: QuestStanding[];
};

export const questKeys = {
  all: ["quests"] as const,
  one: (id: string) => ["quest", id] as const,
  mine: (userId: string) => ["my-quests", userId] as const,
  history: (userId: string) => ["my-quest-history", userId] as const,
  entry: (questId: string, userId: string) => ["my-quest-entry", questId, userId] as const,
  tasks: ["weekly-tasks"] as const,
};

export function questsQuery() {
  return queryOptions({
    queryKey: questKeys.all,
    queryFn: async () => (await getPublicQuests()) as unknown as QuestListRow[],
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}

export function questQuery(id: string | undefined) {
  return queryOptions({
    queryKey: questKeys.one(id ?? "none"),
    enabled: Boolean(id),
    queryFn: async () =>
      (await getPublicQuest({ data: { questId: id! } })) as unknown as QuestDetail | null,
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  });
}

export function weeklyTasksQuery() {
  return queryOptions({
    queryKey: questKeys.tasks,
    queryFn: () => getWeeklyTasks(),
    staleTime: 60_000,
  });
}

export function myQuestsQuery(userId: string | null) {
  return queryOptions({
    queryKey: questKeys.mine(userId ?? "anon"),
    enabled: Boolean(userId),
    queryFn: () => getMyQuests(),
    staleTime: 5_000,
  });
}

export function myQuestHistoryQuery(userId: string | null) {
  return queryOptions({
    queryKey: questKeys.history(userId ?? "anon"),
    enabled: Boolean(userId),
    queryFn: async () => (await getMyQuestHistory()) as unknown as QuestHistoryRow[],
    staleTime: 10_000,
  });
}

export function myQuestEntryQuery(questId: string, userId: string | null) {
  return queryOptions({
    queryKey: questKeys.entry(questId, userId ?? "anon"),
    enabled: Boolean(userId),
    queryFn: async () =>
      (await getMyQuestEntry({ data: { questId } })) as unknown as QuestEntry,
    staleTime: 5_000,
  });
}

/** Human countdown to a quest deadline. */
export function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Finished";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
