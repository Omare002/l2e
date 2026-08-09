import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { followStateQuery, sqk } from "@/lib/social";
import { setFollow } from "@/lib/social.functions";

type Props = {
  targetId: string | null | undefined;
  username: string | undefined;
  className?: string;
};

const SHELL =
  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors duration-200";

/** Follow / Following / Unfollow. State comes from the follows table, so it survives refreshes. */
export function FollowButton({ targetId, username, className = "" }: Props) {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const runFollow = useServerFn(setFollow);
  const [hover, setHover] = useState(false);

  const state = useQuery(followStateQuery(userId, targetId));
  const following = state.data ?? false;

  const toggle = useMutation({
    mutationFn: (action: "follow" | "unfollow") => runFollow({ data: { userId: targetId!, action } as never }),
    onSuccess: (_result, action) => {
      queryClient.setQueryData(sqk.followState(userId ?? "none", targetId ?? "none"), action === "follow");
      queryClient.invalidateQueries({ queryKey: ["follow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["follow-state"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update that follow"),
  });

  if (!targetId || targetId === userId) return null;

  if (!isAuthenticated) {
    return (
      <Link to="/auth" className={`${SHELL} border-border hover:border-neon hover:bg-muted/60 ${className}`}>
        <UserPlus className="size-4" /> Follow{username ? ` @${username}` : ""}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => toggle.mutate(following ? "unfollow" : "follow")}
      disabled={toggle.isPending}
      aria-pressed={following}
      className={`${SHELL} disabled:opacity-60 ${
        following
          ? "border-neon bg-neon/10 text-neon"
          : "border-border hover:border-neon hover:bg-muted/60"
      } ${className}`}
    >
      {following ? (
        <>
          <Check className="size-4" /> {hover ? "Unfollow" : "Following"}
        </>
      ) : (
        <>
          <UserPlus className="size-4" /> Follow
        </>
      )}
    </button>
  );
}
