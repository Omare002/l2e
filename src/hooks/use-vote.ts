import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { toggleVote } from "@/lib/app.functions";
import { myVotesQuery, type ProjectStats } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

function shiftCount(list: ProjectStats[] | undefined, projectId: string, delta: number) {
  if (!list) return list;
  return list.map((p) =>
    p.id === projectId ? { ...p, vote_count: Math.max(0, (p.vote_count ?? 0) + delta) } : p,
  );
}

/**
 * Single source of truth for upvoting. Optimistic locally, authoritative on the
 * server: the server function owns the one-vote-per-user rule and the
 * can't-vote-for-yourself rule, and any failure rolls the UI back.
 */
export function useVote() {
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();
  const runToggle = useServerFn(toggleVote);

  const myVotes = useQuery({
    ...myVotesQuery(userId ?? ""),
    enabled: Boolean(userId),
  });

  const votedIds = myVotes.data ?? [];

  const mutation = useMutation({
    mutationFn: (vars: { projectId: string; ownerId: string }) =>
      runToggle({ data: { projectId: vars.projectId } }),
    onMutate: async ({ projectId }) => {
      const key = myVotesQuery(userId ?? "").queryKey;
      await queryClient.cancelQueries({ queryKey: key });
      const previousVotes = queryClient.getQueryData<string[]>(key) ?? [];
      const wasVoted = previousVotes.includes(projectId);
      const delta = wasVoted ? -1 : 1;

      queryClient.setQueryData<string[]>(
        key,
        wasVoted ? previousVotes.filter((id) => id !== projectId) : [...previousVotes, projectId],
      );
      queryClient.setQueriesData<ProjectStats[]>({ queryKey: ["projects"] }, (old) =>
        shiftCount(old, projectId, delta),
      );
      queryClient.setQueriesData<ProjectStats[]>({ queryKey: ["my-projects"] }, (old) =>
        shiftCount(old, projectId, delta),
      );
      queryClient.setQueriesData<ProjectStats | null>({ queryKey: ["project"] }, (old) =>
        old && old.id === projectId
          ? { ...old, vote_count: Math.max(0, (old.vote_count ?? 0) + delta) }
          : old,
      );
      return { previousVotes, key };
    },
    onError: (error, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previousVotes);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.error(error instanceof Error ? error.message : "Your vote didn't go through");
    },
    onSettled: () => {
      for (const key of ["projects", "project", "my-projects", "leaderboard", "activity", "community-stats"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      if (userId) queryClient.invalidateQueries({ queryKey: myVotesQuery(userId).queryKey });
    },
  });

  return {
    hasVoted: (projectId: string) => votedIds.includes(projectId),
    isPending: (projectId: string) =>
      mutation.isPending && mutation.variables?.projectId === projectId,
    canVote: (ownerId: string) => isAuthenticated && ownerId !== userId,
    isOwn: (ownerId: string) => Boolean(userId) && ownerId === userId,
    isAuthenticated,
    vote: (projectId: string, ownerId: string) => {
      if (!isAuthenticated) {
        toast.info("Sign in to upvote this project");
        return;
      }
      if (ownerId === userId) {
        toast.info("You can't upvote your own project");
        return;
      }
      mutation.mutate({ projectId, ownerId });
    },
  };
}
