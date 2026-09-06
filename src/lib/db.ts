import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getPublicProjects } from "@/lib/public-projects.functions";
import {
  getPublicActivity,
  getPublicComments,
  getPublicCommunityTotals,
  getPublicDiscussion,
  getPublicDiscussions,
  getPublicLeaderboard,
  getPublicProfile,
  getPublicProject,
  getPublicReplies,
} from "@/lib/public-reads.functions";

export type ProfileRow = Tables<"profiles">;
export type PublicProfileRow = Omit<ProfileRow, "id"> & { id: string | null };
export type ProjectRow = Tables<"projects">;
export type ProjectStats = Tables<"project_stats">;
export type LeaderboardRow = Tables<"leaderboard">;
export type CommentRow = Tables<"comments">;
export type DiscussionRow = Tables<"discussions">;
export type DiscussionReplyRow = Tables<"discussion_replies">;

type AuthorLite = Pick<ProfileRow, "username" | "display_name" | "avatar_url" | "accent_color">;

export type DiscussionWithAuthor = DiscussionRow & {
  author: AuthorLite | null;
  reply_count?: number;
};

export type ReplyWithAuthor = DiscussionReplyRow & { author: AuthorLite | null };

export type CommentWithAuthor = CommentRow & {
  author: Pick<ProfileRow, "username" | "display_name" | "avatar_url" | "accent_color"> | null;
};

export type ActivityItem = Tables<"activity_events"> & {
  actor: Pick<ProfileRow, "username" | "display_name" | "avatar_url" | "accent_color"> | null;
  project: Pick<ProjectRow, "slug" | "title"> | null;
};

/** Any Supabase error becomes a friendly, non-leaking Error. */
function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  fallback: string,
): T {
  if (result.error) {
    console.error(`[db] ${fallback}:`, result.error.message);
    throw new Error(fallback);
  }
  return result.data as T;
}

export const PROJECT_SORTS = [
  "Trending",
  "Newest",
  "Most Voted",
  "Most Commented",
  "Recently Updated",
] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const qk = {
  leaderboard: ["leaderboard"] as const,
  projects: (sort: ProjectSort, category: string) => ["projects", sort, category] as const,
  project: (slug: string) => ["project", slug] as const,
  myProjects: (userId: string) => ["my-projects", userId] as const,
  profile: (username: string) => ["profile", username] as const,
  myProfile: (userId: string) => ["my-profile", userId] as const,
  myVotes: (userId: string) => ["my-votes", userId] as const,
  comments: (projectId: string) => ["comments", projectId] as const,
  discussions: ["discussions"] as const,
  discussion: (id: string) => ["discussion", id] as const,
  replies: (id: string) => ["discussion-replies", id] as const,
  activity: ["activity"] as const,
  stats: ["community-stats"] as const,
  rankHistory: (profileId: string) => ["rank-history", profileId] as const,
  commentsWritten: (userId: string) => ["comments-written", userId] as const,
  signedUrl: (bucket: string, path: string) => ["signed-url", bucket, path] as const,
};

export const PROJECT_PAGE_SIZE = 12;

function applySort(query: any, sort: ProjectSort) {
  switch (sort) {
    case "Newest":
      return query.order("created_at", { ascending: false });
    case "Most Voted":
      return query
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: false });
    case "Most Commented":
      return query
        .order("comment_count", { ascending: false })
        .order("created_at", { ascending: false });
    case "Recently Updated":
      return query.order("updated_at", { ascending: false });
    default:
      return query
        .order("vote_count", { ascending: false })
        .order("comment_count", { ascending: false })
        .order("created_at", { ascending: false });
  }
}

export function projectsQuery(sort: ProjectSort, category: string, limit = PROJECT_PAGE_SIZE) {
  return queryOptions({
    queryKey: [...qk.projects(sort, category), limit],
    queryFn: () => getPublicProjects({ data: { sort, category, limit } }),
    staleTime: 15_000,
  });
}

export function projectQuery(slug: string) {
  return queryOptions({
    queryKey: qk.project(slug),
    queryFn: async (): Promise<ProjectStats | null> => {
      // Public read first so guests always see published projects; signed-in
      // owners fall back to their own (possibly unpublished) row.
      const published = await getPublicProject({ data: { slug } });
      if (published) return published as ProjectStats;
      const res = await supabase.from("project_stats").select("*").eq("slug", slug).maybeSingle();
      if (res.error) return null;
      return res.data ?? null;
    },
    staleTime: 10_000,
  });
}

export function myProjectsQuery(userId: string) {
  return queryOptions({
    queryKey: qk.myProjects(userId),
    queryFn: async (): Promise<ProjectStats[]> => {
      const res = await supabase
        .from("project_stats")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      return unwrap(res, "Could not load your projects") ?? [];
    },
  });
}

export function leaderboardQuery() {
  return queryOptions({
    queryKey: qk.leaderboard,
    queryFn: async (): Promise<LeaderboardRow[]> =>
      (await getPublicLeaderboard()) as LeaderboardRow[],
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}

export function profileQuery(username: string) {
  return queryOptions({
    queryKey: qk.profile(username),
    queryFn: async (): Promise<PublicProfileRow | null> =>
      (await getPublicProfile({ data: { username } })) as PublicProfileRow | null,
  });
}

export function myProfileQuery(userId: string) {
  return queryOptions({
    queryKey: qk.myProfile(userId),
    queryFn: async (): Promise<ProfileRow | null> => {
      const res = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return unwrap(res, "Could not load your profile");
    },
  });
}

export function myVotesQuery(userId: string) {
  return queryOptions({
    queryKey: qk.myVotes(userId),
    queryFn: async (): Promise<string[]> => {
      const res = await supabase.from("votes").select("project_id").eq("user_id", userId);
      return (unwrap(res, "Could not load your votes") ?? []).map((r) => r.project_id);
    },
    staleTime: 30_000,
  });
}

export function commentsQuery(projectId: string | undefined) {
  return queryOptions({
    queryKey: qk.comments(projectId ?? "none"),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      return (await getPublicComments({
        data: { projectId: projectId! },
      })) as unknown as CommentWithAuthor[];
    },
    placeholderData: keepPreviousData,
  });
}

export function commentsWrittenQuery(userId: string) {
  return queryOptions({
    queryKey: qk.commentsWritten(userId),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId);
      if (error) return 0;
      return count ?? 0;
    },
  });
}

export function discussionsQuery() {
  return queryOptions({
    queryKey: qk.discussions,
    queryFn: async (): Promise<DiscussionWithAuthor[]> => {
      return (await getPublicDiscussions()) as unknown as DiscussionWithAuthor[];
    },
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}

export function discussionQuery(id: string) {
  return queryOptions({
    queryKey: qk.discussion(id),
    queryFn: async (): Promise<DiscussionWithAuthor | null> => {
      return (await getPublicDiscussion({
        data: { id },
      })) as unknown as DiscussionWithAuthor | null;
    },
    placeholderData: keepPreviousData,
  });
}

export function repliesQuery(discussionId: string | undefined) {
  return queryOptions({
    queryKey: qk.replies(discussionId ?? "none"),
    enabled: Boolean(discussionId),
    queryFn: async (): Promise<ReplyWithAuthor[]> => {
      return (await getPublicReplies({
        data: { discussionId: discussionId! },
      })) as unknown as ReplyWithAuthor[];
    },
    placeholderData: keepPreviousData,
  });
}

export function activityQuery(limit = 12) {
  return queryOptions({
    queryKey: [...qk.activity, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      return (await getPublicActivity({ data: { limit } })) as unknown as ActivityItem[];
    },
    staleTime: 10_000,
  });
}

/** Scoped by public username: guests never receive raw account IDs. */
export function userActivityQuery(username: string, limit = 8) {
  return queryOptions({
    queryKey: ["user-activity", username, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      return (await getPublicActivity({ data: { limit, username } })) as unknown as ActivityItem[];
    },
  });
}

export function rankHistoryQuery(profileId: string) {
  return queryOptions({
    queryKey: qk.rankHistory(profileId),
    queryFn: async () => {
      const res = await supabase.rpc("rank_history", { _profile_id: profileId, _days: 7 });
      return unwrap(res, "Could not load your ranking trend") ?? [];
    },
    staleTime: 60_000,
  });
}

export function communityStatsQuery() {
  return queryOptions({
    queryKey: qk.stats,
    queryFn: async () => {
      // Vote rows aren't readable by anonymous visitors, so totals come from a
      // server-side projection. Only "this week" is time-scoped; the total is
      // all-time and must never reset.
      const data = await getPublicCommunityTotals();

      return [
        { label: "Builders", value: data?.builders ?? 0 },
        { label: "Projects published", value: data?.projects_published ?? 0 },
        { label: "Total upvotes", value: data?.upvotes ?? 0 },
        { label: "Upvotes this week", value: data?.upvotes_week ?? 0 },
        { label: "New this week", value: data?.projects_week ?? 0 },
      ];
    },
    staleTime: 30_000,
  });
}
