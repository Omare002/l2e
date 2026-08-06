import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * One shared realtime channel. Every insert/update/delete on the community
 * tables nudges React Query, so votes, projects, the race and the feed all
 * refresh without a reload.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout> | null = null;
    const refresh = (keys: string[]) => {
      if (frame) clearTimeout(frame);
      frame = setTimeout(() => {
        for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
      }, 250);
    };

    const channel = supabase
      .channel("community-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () =>
        refresh(["projects", "project", "leaderboard", "my-projects", "activity", "community-stats"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () =>
        refresh(["projects", "project", "leaderboard", "my-projects", "activity", "community-stats"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () =>
        refresh(["projects", "project", "comments", "activity", "community-stats"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        refresh(["leaderboard", "profile", "my-profile", "community-stats"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_events" }, () =>
        refresh(["activity", "user-activity"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "discussions" }, () =>
        refresh(["discussions", "discussion", "activity", "community-stats"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "discussion_replies" }, () =>
        refresh(["discussions", "discussion", "discussion-replies", "activity"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        refresh(["conversations"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        refresh(["messages", "conversations"]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        refresh(["notifications"]),
      )
      .subscribe();

    return () => {
      if (frame) clearTimeout(frame);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
