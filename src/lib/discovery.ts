import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchPublicBuilders, type DirectoryBuilder } from "@/lib/discovery.functions";

export type { DirectoryBuilder };

export const dqk = {
  builders: (term: string) => ["builder-directory", term] as const,
  myFollowing: (userId: string) => ["my-following", userId] as const,
};

/** Directory results. Works signed out — search never requires an account. */
export function builderDirectoryQuery(term: string) {
  return queryOptions({
    queryKey: dqk.builders(term.trim().toLowerCase()),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async (): Promise<DirectoryBuilder[]> => {
      try {
        return await searchPublicBuilders({ data: { term: term.trim(), limit: 24 } as never });
      } catch (error) {
        console.error("[discovery] directory:", error);
        return [];
      }
    },
  });
}

/**
 * The ids the signed-in user follows. RLS only ever returns rows where the
 * viewer is the follower, so this can't reveal anyone else's relationships.
 */
export function myFollowingQuery(userId: string | null) {
  return queryOptions({
    queryKey: dqk.myFollowing(userId ?? "none"),
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId!);
      if (error) {
        console.error("[discovery] my following:", error.message);
        return [];
      }
      return (data ?? []).map((r) => r.following_id);
    },
  });
}
