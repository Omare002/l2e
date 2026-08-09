import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { collaboratorsQuery } from "@/lib/social";

type Owner = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  accent_color: string | null;
};

/** "Built by" credits: the owner is labelled, collaborators are shown as equals. */
export function BuiltBy({ projectId, owner }: { projectId: string | undefined; owner: Owner }) {
  const { data } = useQuery(collaboratorsQuery(projectId));
  const collaborators = data ?? [];

  const people = [
    {
      key: "owner",
      username: owner.username ?? "",
      display_name: owner.display_name ?? "Builder",
      avatar_url: owner.avatar_url,
      accent_color: owner.accent_color,
      isOwner: true,
    },
    ...collaborators.map((c) => ({
      key: c.id,
      username: c.username,
      display_name: c.display_name,
      avatar_url: c.avatar_url,
      accent_color: c.accent_color,
      isOwner: false,
    })),
  ];

  return (
    <div className="mt-5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Built by</div>
      <ul className="mt-2.5 flex flex-wrap gap-2.5">
        {people.map((p) => (
          <li key={p.key}>
            <Link
              to="/builders/$username"
              params={{ username: p.username }}
              className="inline-flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3.5 text-[13px] transition-colors duration-200 hover:border-neon hover:text-neon"
            >
              <UserAvatar
                name={p.display_name}
                path={p.avatar_url}
                accent={p.accent_color}
                size={26}
                eager={p.isOwner}
              />
              <span className="truncate">{p.display_name}</span>
              {p.isOwner ? (
                <span className="rounded-full bg-neon-dim px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide">
                  Owner
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
