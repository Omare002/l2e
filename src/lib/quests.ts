import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getMyQuestEntry,
  getMyQuestHistory,
  getMyQuests,
  getPublicQuest,
  getPublicQuests,
  getQuestMessages,
  getQuestSubmissions,
  getWeeklyTasks,
  getQuestRoster,
  amIQuestCreator,
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
  visibility: string;
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
  joined_at: string;
  project_title: string | null;
  project_slug: string | null;
  project_published: boolean | null;
  project_status: string | null;
  votes: number;
};

export type QuestMessage = {
  id: string;
  body: string;
  created_at: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    accent_color: string;
  } | null;
  mine: boolean;
};

export type QuestEntry = {
  status: string;
  project_id: string | null;
  submitted_at: string | null;
} | null;

export type MyQuestRow = {
  id: string;
  status: string;
  project_id: string | null;
  submitted_at: string | null;
  project: { title: string; slug: string; published: boolean } | null;
  quest: {
    id: string;
    title: string;
    description: string;
    kind: string;
    visibility: string;
    starts_at: string;
    ends_at: string;
    closed_at: string | null;
    winner_id: string | null;
    creator_id: string;
    task: { title: string; prompt: string } | null;
  } | null;
};

export type QuestSubmission = {
  status: string;
  submitted_at: string | null;
  joined_at: string;
  member: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    accent_color: string;
  } | null;
  project: { title: string; slug: string; published: boolean } | null;
};

export type QuestHistoryRow = {
  id: string;
  title: string;
  kind: string;
  visibility?: string;
  starts_at: string;
  ends_at: string;
  closed_at: string | null;
  winner_votes: number | null;
  winner: { username: string; display_name: string } | null;
  task: { title: string } | null;
  participants: { status: string }[] | null;
  my_status: string;
  submitted: boolean;
  submitted_at: string | null;
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
  chat: (questId: string) => ["quest-chat", questId] as const,
  owner: (questId: string, userId: string) => ["quest-owner", questId, userId] as const,
  submissions: (questId: string) => ["quest-submissions", questId] as const,
  roster: (questId: string) => ["quest-roster", questId] as const,
};

/** Creator-only headcount used to warn before deleting a quest. */
export function questRosterQuery(questId: string, enabled: boolean) {
  return queryOptions({
    queryKey: questKeys.roster(questId),
    enabled,
    queryFn: () => getQuestRoster({ data: { questId } }),
    staleTime: 10_000,
  });
}

/** Open (not yet started is not modelled) → Active → Completed/Expired. */
export function questState(quest: { starts_at?: string; ends_at: string; closed_at?: string | null }) {
  if (quest.closed_at) return "completed" as const;
  if (new Date(quest.ends_at) <= new Date()) return "expired" as const;
  return "active" as const;
}

export const QUEST_STATE_LABEL = {
  active: "Active",
  completed: "Completed",
  expired: "Expired",
} as const;

export function isOpenQuest(quest: { kind: string; visibility?: string; closed_at?: string | null }) {
  return (
    (quest.visibility ?? "public") === "public" &&
    (quest.kind === "group" || quest.kind === "shared_task")
  );
}

export function questAccessLabel(quest: { kind: string; visibility?: string }) {
  return isOpenQuest(quest) ? "Open" : "Private";
}

export function questCreatorQuery(questId: string, userId: string | null) {
  return queryOptions({
    queryKey: questKeys.owner(questId, userId ?? "anon"),
    enabled: Boolean(userId),
    queryFn: () => amIQuestCreator({ data: { questId } }),
    staleTime: 30_000,
  });
}

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
    queryFn: async () => (await getMyQuests()) as unknown as MyQuestRow[],
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

export function questSubmissionsQuery(questId: string, enabled: boolean) {
  return queryOptions({
    queryKey: questKeys.submissions(questId),
    enabled,
    queryFn: async () =>
      (await getQuestSubmissions({ data: { questId } })) as unknown as QuestSubmission[],
    staleTime: 5_000,
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

export function questChatQuery(questId: string, enabled: boolean) {
  return queryOptions({
    queryKey: questKeys.chat(questId),
    enabled,
    queryFn: async () =>
      (await getQuestMessages({ data: { questId } })) as unknown as QuestMessage[],
    staleTime: 5_000,
  });
}

/** Short "joined 3d ago" style label. */
export function sinceLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
