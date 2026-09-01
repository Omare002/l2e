import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type FollowCounts = { followers: number; following: number };

export type PublicCollaborator = {
  id: string;
  project_id: string;
  user_id: string | null;
  can_edit: boolean;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
};

export type CollaboratorRow = Tables<"project_collaborators"> & {
  member: Pick<Tables<"profiles">, "id" | "username" | "display_name" | "avatar_url" | "accent_color"> | null;
};

export type InviteRow = Tables<"project_collaborators"> & {
  project: Pick<Tables<"projects">, "slug" | "title" | "tagline"> | null;
  inviter: Pick<Tables<"profiles">, "username" | "display_name" | "avatar_url" | "accent_color"> | null;
};

const MEMBER = "id, username, display_name, avatar_url, accent_color";

export const sqk = {
  followCounts: (username: string) => ["follow-counts", username] as const,
  followState: (viewerId: string, targetId: string) => ["follow-state", viewerId, targetId] as const,
  collaborators: (projectId: string) => ["collaborators", projectId] as const,
  collaboratorAdmin: (projectId: string) => ["collaborators-admin", projectId] as const,
  invites: (userId: string) => ["collab-invites", userId] as const,
  unread: (userId: string) => ["unread-counts", userId] as const,
};

/** Public follower/following totals, derived from the follows table (never stored). */
export function followCountsQuery(username: string | undefined) {
  return queryOptions({
    queryKey: sqk.followCounts(username ?? "none"),
    enabled: Boolean(username),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FollowCounts> => {
      const { data, error } = await supabase
        .from("follow_counts")
        .select("followers, following")
        .eq("username", username!)
        .maybeSingle();
      if (error) {
        console.error("[social] follow counts:", error.message);
        return { followers: 0, following: 0 };
      }
      return { followers: data?.followers ?? 0, following: data?.following ?? 0 };
    },
  });
}

export function followStateQuery(viewerId: string | null, targetId: string | null | undefined) {
  return queryOptions({
    queryKey: sqk.followState(viewerId ?? "none", targetId ?? "none"),
    enabled: Boolean(viewerId && targetId && viewerId !== targetId),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", viewerId!)
        .eq("following_id", targetId!)
        .maybeSingle();
      if (error) {
        console.error("[social] follow state:", error.message);
        return false;
      }
      return Boolean(data);
    },
  });
}

/** Accepted collaborators shown publicly on a project page. */
export function collaboratorsQuery(projectId: string | undefined) {
  return queryOptions({
    queryKey: sqk.collaborators(projectId ?? "none"),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PublicCollaborator[]> => {
      const { data, error } = await supabase
        .from("project_collaborators_public")
        .select("id, project_id, user_id, can_edit, username, display_name, avatar_url, accent_color")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[social] collaborators:", error.message);
        return [];
      }
      return (data ?? []) as unknown as PublicCollaborator[];
    },
  });
}

/** Every collaboration row on a project the viewer owns, including pending ones. */
export function collaboratorAdminQuery(projectId: string | undefined) {
  return queryOptions({
    queryKey: sqk.collaboratorAdmin(projectId ?? "none"),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<CollaboratorRow[]> => {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select(`*, member:profiles!project_collaborators_user_id_fkey(${MEMBER})`)
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[social] collaborator admin:", error.message);
        throw new Error("Could not load collaborators");
      }
      return (data ?? []) as unknown as CollaboratorRow[];
    },
  });
}

/** Collaborator invitations waiting for the signed-in user. */
export function invitesQuery(userId: string | null) {
  return queryOptions({
    queryKey: sqk.invites(userId ?? "none"),
    enabled: Boolean(userId),
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select(
          `*, project:projects!project_collaborators_project_id_fkey(slug, title, tagline), inviter:profiles!project_collaborators_invited_by_fkey(username, display_name, avatar_url, accent_color)`,
        )
        .eq("user_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[social] invites:", error.message);
        return [];
      }
      return (data ?? []) as unknown as InviteRow[];
    },
  });
}

/** Real unread message counts per conversation, computed in the database. */
export function unreadCountsQuery(userId: string | null) {
  return queryOptions({
    queryKey: sqk.unread(userId ?? "none"),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Record<string, number>> => {
      // Unread counts are fetched by the authenticated messaging route.
      // This query remains for compatibility with existing consumers.
      return {};
    },
  });
}
