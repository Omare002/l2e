import { Link } from "@tanstack/react-router";
import { ChevronUp, ExternalLink, Github, MessageSquare } from "lucide-react";
import type { ProjectStats } from "@/lib/db";
import { normalizeCategory, statusLabel } from "@/data/community";
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
    <article className="surface-card lift-hover group flex flex-col p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={project.owner_display_name}
            path={project.owner_avatar_url}
            accent={project.owner_accent_color}
            size={32}
          />
          <div className="min-w-0 leading-tight">
            {project.owner_username ? (
              <Link
                to="/builders/$username"
                params={{ username: project.owner_username }}
                className="block truncate text-[13px] font-medium text-on-dark transition-colors duration-200 hover:text-neon"
              >
                {project.owner_display_name ?? "Builder"}
              </Link>
            ) : (
              <span className="block truncate text-[13px] font-medium text-on-dark">
                {project.owner_display_name ?? "Builder"}
              </span>
            )}
            <div className="mt-0.5 truncate font-mono text-[11px] text-on-dark-muted">
              {project.owner_username ? `@${project.owner_username}` : "Builder"}
            </div>
          </div>
        </div>
        {rank ? (
          <span
            className={`glass-pill shrink-0 px-3 py-1.5 font-mono text-[10px] tabular-nums ${
              rank <= 3 ? "text-neon" : "text-on-dark-muted"
            }`}
          >
            #{rank}
          </span>
        ) : null}
      </div>

      <div className="elevated-media mt-4 aspect-[16/8] w-full bg-white/[0.03]">
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
        className="mt-4 text-[15px] font-semibold tracking-tight text-on-dark transition-colors duration-200 group-hover:text-neon sm:text-base"
      >
        {project.title}
      </Link>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-on-dark-muted">{project.tagline}</p>


      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <span className="glass-pill border-neon/25 bg-neon-dim/20 px-2.5 py-1 font-mono text-[10px] text-neon">
          {normalizeCategory(project.category)}
        </span>
        <span className="glass-pill px-2.5 py-1 font-mono text-[10px] text-on-dark-muted">
          {statusLabel(project.status ?? "shipped")}
        </span>
        {(project.tech ?? []).slice(0, 3).map((t) => (
          <span
            key={t}
            className="glass-pill px-2.5 py-1 font-mono text-[10px] text-on-dark-muted"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-white/[0.05] pt-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-on-dark-muted">

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
          className={`glass-pill flex min-h-9 shrink-0 items-center gap-1.5 px-3.5 py-1.5 font-mono text-[13px] font-semibold tabular-nums transition-all duration-200 disabled:opacity-50 ${
            voted
              ? "border-neon/60 bg-neon/15 text-neon shadow-[0_6px_18px_-10px_color-mix(in_oklab,var(--neon)_45%,transparent)]"
              : "border-white/15 text-on-dark hover:border-neon/60 hover:bg-neon/10 hover:text-neon"
          }`}

        >
          <ChevronUp className={`size-4 ${pending ? "animate-pulse" : ""}`} />{" "}
          {project.vote_count ?? 0}
        </button>
      </div>
    </article>
  );
}
