import { Link } from "@tanstack/react-router";
import { ChevronUp, ExternalLink, Github, MessageSquare } from "lucide-react";
import type { ProjectStats } from "@/lib/db";
import { statusLabel } from "@/data/community";
import { useVote } from "@/hooks/use-vote";
import { useStoredImage } from "@/lib/media";
import { UserAvatar } from "@/components/user-avatar";

export function ProjectCard({ project, rank }: { project: ProjectStats; rank?: number }) {
  const { hasVoted, vote, isPending, isOwn } = useVote();
  const thumb = useStoredImage("thumbnails", project.thumbnail_url);

  const projectId = project.id!;
  const ownerId = project.owner_id!;
  const voted = hasVoted(projectId);
  const pending = isPending(projectId);
  const own = isOwn(ownerId);

  return (
    <article className="surface-card lift-hover group flex flex-col p-5 sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={project.owner_display_name}
            path={project.owner_avatar_url}
            accent={project.owner_accent_color}
            size={32}
          />
          <div className="min-w-0 leading-tight">
            <Link
              to="/builders/$username"
              params={{ username: project.owner_username ?? "" }}
              className="block truncate text-[13px] font-medium text-white transition-colors duration-200 hover:text-neon"
            >
              {project.owner_display_name}
            </Link>
            <div className="mt-0.5 truncate font-mono text-[11px] text-white/40">
              @{project.owner_username} · {project.category}
            </div>
          </div>
        </div>
        {rank ? (
          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] tabular-nums text-white/50">
            #{rank}
          </span>
        ) : null}
      </div>

      <div className="mt-5 aspect-[16/7] w-full overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.03]">
        {thumb ? (
          <img
            src={thumb}
            alt={`${project.title} preview`}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
      </div>

      <Link
        to="/projects/$slug"
        params={{ slug: project.slug ?? "" }}
        className="mt-5 text-[15px] font-semibold tracking-tight text-white transition-colors duration-200 group-hover:text-neon sm:text-base"
      >
        {project.title}
      </Link>
      <p className="mt-2 text-[13px] leading-relaxed text-white/55">{project.tagline}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-white/55">
          {statusLabel(project.status ?? "shipped")}
        </span>
        {(project.tech ?? []).slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-white/55"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-white/[0.07] pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/45">
          {project.demo_url ? (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 transition-colors duration-200 hover:text-neon"
            >
              <ExternalLink className="size-3.5" /> Demo
            </a>
          ) : null}
          {project.github_url ? (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 transition-colors duration-200 hover:text-neon"
            >
              <Github className="size-3.5" /> Code
            </a>
          ) : null}
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> {project.comment_count ?? 0}
          </span>
        </div>
        <button
          type="button"
          aria-pressed={voted}
          aria-label={`Upvote ${project.title}`}
          disabled={pending || own}
          onClick={() => vote(projectId, ownerId)}
          title={own ? "You can't upvote your own project" : undefined}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tabular-nums transition-colors duration-200 disabled:opacity-50 ${
            voted
              ? "border-neon/50 bg-neon/10 text-neon"
              : "border-white/10 text-white/70 hover:border-neon/50 hover:text-neon"
          }`}
        >
          <ChevronUp className={`size-3.5 ${pending ? "animate-pulse" : ""}`} />{" "}
          {project.vote_count ?? 0}
        </button>
      </div>
    </article>
  );
}
