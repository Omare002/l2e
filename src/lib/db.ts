import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;
export type ProjectRow = Tables<"projects">;
export type ProjectStats = Tables<"project_stats">;
export type LeaderboardRow = Tables<"leaderboard">;
export type CommentRow = Tables<"comments">;

export type CommentWithAuthor = CommentRow & {
  author: Pick<ProfileRow, "username" | "display_name" | "avatar_url" | "accent_color"> | null;
};

export type ActivityItem = Tables<"activity_events"> & {
  actor: Pick<ProfileRow, "username" | "display_name" | "avatar_url" | "accent_color"> | null;
  project: Pick<ProjectRow, "slug" | "title"> | null;
};

/** Any Supabase error becomes a friendly, non-leaking Error. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, fallback: string): T {
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
  activity: ["activity"] as const,
  stats: ["community-stats"] as const,
  rankHistory: (profileId: string) => ["rank-history", profileId] as const,
  commentsWritten: (userId: string) => ["comments-written", userId] as const,
  signedUrl: (bucket: string, path: string) => ["signed-url", bucket, path] as const,
};

export const PROJECT_PAGE_SIZE = 12;

function applySort(
  query: any,
  sort: ProjectSort,
) {
  switch (sort) {
    case "Newest":
      return query.order("created_at", { ascending: false });
    case "Most Voted":
      return query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
    case "Most Commented":
      return query.order("comment_count", { ascending: false }).order("created_at", { ascending: false });
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
    queryFn: async (): Promise<ProjectStats[]> => {
      let q = supabase.from("project_stats").select("*").eq("published", true);
      if (category !== "All") q = q.eq("category", category);
      const res = await applySort(q, sort).limit(limit);
      return unwrap(res, "Could not load projects") ?? [];
    },
    staleTime: 15_000,
  });
}

export function projectQuery(slug: string) {
  return queryOptions({
    queryKey: qk.project(slug),
    queryFn: async (): Promise<ProjectStats | null> => {
      const res = await supabase.from("project_stats").select("*").eq("slug", slug).maybeSingle();
      return unwrap(res, "Could not load this project");
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
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const res = await supabase
        .from("leaderboard")
        .select("*")
        .order("rank", { ascending: true })
        .limit(100);
      return unwrap(res, "Could not load the leaderboard") ?? [];
    },
    staleTime: 10_000,
  });
}

export function profileQuery(username: string) {
  return queryOptions({
    queryKey: qk.profile(username),
    queryFn: async (): Promise<ProfileRow | null> => {
      const res = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return unwrap(res, "Could not load this profile");
    },
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
      const res = await supabase
        .from("comments")
        .select("*, author:profiles!comments_author_id_fkey(username, display_name, avatar_url, accent_color)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return (unwrap(res, "Could not load feedback") ?? []) as unknown as CommentWithAuthor[];
    },
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

export function activityQuery(limit = 12) {
  return queryOptions({
    queryKey: [...qk.activity, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const res = await supabase
        .from("activity_events")
        .select(
          "*, actor:profiles!activity_events_actor_id_fkey(username, display_name, avatar_url, accent_color), project:projects!activity_events_project_id_fkey(slug, title)",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      return (unwrap(res, "Could not load the activity feed") ?? []) as unknown as ActivityItem[];
    },
    staleTime: 10_000,
  });
}

export function userActivityQuery(profileId: string, limit = 8) {
  return queryOptions({
    queryKey: ["user-activity", profileId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const res = await supabase
        .from("activity_events")
        .select(
          "*, actor:profiles!activity_events_actor_id_fkey(username, display_name, avatar_url, accent_color), project:projects!activity_events_project_id_fkey(slug, title)",
        )
        .eq("actor_id", profileId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (unwrap(res, "Could not load recent activity") ?? []) as unknown as ActivityItem[];
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
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const count = async (
        table: "profiles" | "projects" | "votes" | "comments",
        build?: (q: any) => any,
      ) => {
        let q = supabase.from(table).select("id", { count: "exact", head: true });
        if (build) q = build(q);
        const { count: n } = await q;
        return n ?? 0;
      };

      const [builders, projects, votes, votesWeek, projectsWeek] = await Promise.all([
        count("profiles"),
        count("projects", (q) => q.eq("published", true)),
        count("votes"),
        count("votes", (q) => q.gte("created_at", weekAgo)),
        count("projects", (q) => q.eq("published", true).gte("created_at", weekAgo)),
      ]);

      return [
        { label: "Builders", value: builders },
        { label: "Projects published", value: projects },
        { label: "Total upvotes", value: votes },
        { label: "Upvotes this week", value: votesWeek },
        { label: "New this week", value: projectsWeek },
      ];
    },
    staleTime: 30_000,
  });
}
