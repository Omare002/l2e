import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { collaboratorAdminQuery } from "@/lib/social";
import {
  inviteCollaborator,
  removeCollaborator,
  searchBuilders,
  setCollaboratorEdit,
} from "@/lib/social.functions";

type Found = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
};

/** Owner-only: invite builders, grant edit rights, remove collaborators. */
export function CollaboratorManager({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const runSearch = useServerFn(searchBuilders);
  const runInvite = useServerFn(inviteCollaborator);
  const runRemove = useServerFn(removeCollaborator);
  const runEdit = useServerFn(setCollaboratorEdit);

  const rows = useQuery(collaboratorAdminQuery(projectId));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["collaborators-admin"] });
    queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const search = useMutation({
    mutationFn: () => runSearch({ data: { term: term.trim(), projectId } as never }),
    onSuccess: (found) => setResults(found as unknown as Found[]),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not search builders"),
  });

  const invite = useMutation({
    mutationFn: (userId: string) => runInvite({ data: { projectId, userId, canEdit: false } as never }),
    onSuccess: () => {
      setTerm("");
      setResults([]);
      refresh();
      toast.success("Invitation sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send that invitation"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => runRemove({ data: { id } as never }),
    onSuccess: () => {
      refresh();
      toast.success("Collaborator removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove that collaborator"),
  });

  const permission = useMutation({
    mutationFn: (vars: { id: string; canEdit: boolean }) => runEdit({ data: vars as never }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update those permissions"),
  });

  const list = rows.data ?? [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (term.trim().length < 2) return;
          search.mutate();
        }}
        className="flex items-center gap-2 rounded-full border border-border px-3 transition-colors duration-200 focus-within:border-neon"
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search builders by name or @username"
          className="min-h-10 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={search.isPending || term.trim().length < 2}
          className="shrink-0 font-mono text-[11px] text-muted-foreground transition-colors duration-200 hover:text-neon disabled:opacity-50"
        >
          {search.isPending ? "…" : "Find"}
        </button>
      </form>

      {results.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <UserAvatar name={r.display_name} path={r.avatar_url} accent={r.accent_color} size={28} />
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {r.display_name}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">@{r.username}</span>
              </span>
              <button
                type="button"
                onClick={() => invite.mutate(r.id)}
                disabled={invite.isPending}
                className="min-h-9 shrink-0 rounded-full border border-border px-3 text-[12px] transition-colors duration-200 hover:border-neon disabled:opacity-60"
              >
                Invite
              </button>
            </li>
          ))}
        </ul>
      ) : search.isSuccess && results.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">No matching builders available to invite.</p>
      ) : null}

      {list.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <UserAvatar
                name={c.member?.display_name}
                path={c.member?.avatar_url}
                accent={c.member?.accent_color}
                size={28}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {c.member?.display_name ?? "Builder"}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  {c.status === "accepted" ? "collaborator" : c.status}
                </span>
              </span>
              {c.status === "accepted" ? (
                <label className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={c.can_edit}
                    onChange={(e) => permission.mutate({ id: c.id, canEdit: e.target.checked })}
                    className="size-3.5 accent-[var(--neon)]"
                  />
                  can edit
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                aria-label="Remove collaborator"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
