import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { invitesQuery } from "@/lib/social";
import { respondToCollaboration } from "@/lib/social.functions";

/** Private collaborator invitations waiting for the signed-in builder. */
export function CollaborationInvites() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const runRespond = useServerFn(respondToCollaboration);
  const { data } = useQuery(invitesQuery(userId));
  const invites = data ?? [];

  const respond = useMutation({
    mutationFn: (vars: { id: string; action: "accept" | "decline" }) => runRespond({ data: vars as never }),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["collab-invites"] });
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      toast.success(vars.action === "accept" ? "You're on the project" : "Invitation declined");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update that invitation"),
  });

  if (invites.length === 0) return null;

  return (
    <section className="mt-14 sm:mt-16">
      <h2 className="text-[15px] font-semibold tracking-tight">Collaboration invitations</h2>
      <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <UserAvatar
              name={invite.inviter?.display_name}
              path={invite.inviter?.avatar_url}
              accent={invite.inviter?.accent_color}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px]">
                <span className="font-medium">{invite.inviter?.display_name ?? "A builder"}</span> invited you
                to collaborate on{" "}
                <span className="font-medium">{invite.project?.title ?? "their project"}</span>
              </div>
              {invite.project?.tagline ? (
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{invite.project.tagline}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => respond.mutate({ id: invite.id, action: "accept" })}
                disabled={respond.isPending}
                className="min-h-10 rounded-full bg-foreground px-4 text-[12px] font-medium text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => respond.mutate({ id: invite.id, action: "decline" })}
                disabled={respond.isPending}
                className="min-h-10 rounded-full border border-border px-4 text-[12px] transition-colors duration-200 hover:border-neon"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
