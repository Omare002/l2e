import { Link } from "@tanstack/react-router";
import { MessageSquare, ExternalLink, Github, ChevronUp } from "lucide-react";
import type { Project } from "@/data/community";
import { builderBy } from "@/data/community";
import { useVotes } from "@/hooks/use-votes";

export function ProjectCard({ project, rank }: { project: Project; rank?: number }) {
  const builder = builderBy(project.builder);
  const { toggle, voteCount, hasVoted } = useVotes();
  const votes = voteCount(project.slug);
  const voted = hasVoted(project.slug);

  return (
    <article className="surface-card lift-hover group flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-8 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-ink"
            style={{ background: builder?.color ?? "var(--neon)" }}
          >
            {builder?.initials}
          </span>
          <div className="leading-tight">
            <Link
              to="/builders/$username"
              params={{ username: project.builder }}
              className="text-[13px] font-medium text-white transition-colors duration-200 hover:text-neon"
            >
              {builder?.name}
            </Link>
            <div className="mt-0.5 font-mono text-[11px] text-white/40">
              @{project.builder} · {project.category}
            </div>
          </div>
        </div>
        {rank ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] tabular-nums text-white/50">
            #{rank}
          </span>
        ) : null}
      </div>

      <div
        className="mt-5 h-28 w-full rounded-md border border-white/[0.06]"
        style={{
          background: `linear-gradient(140deg, ${project.thumbTone}1f, transparent 70%)`,
        }}
        aria-hidden
      />

      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        className="mt-5 text-base font-semibold tracking-tight text-white transition-colors duration-200 group-hover:text-neon"
      >
        {project.name}
      </Link>
      <p className="mt-2 text-[13px] leading-relaxed text-white/55">{project.tagline}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-white/55"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
        <div className="flex items-center gap-4 font-mono text-[11px] text-white/45">
          <a
            href={project.demoUrl}
            className="flex items-center gap-1.5 transition-colors duration-200 hover:text-neon"
          >
            <ExternalLink className="size-3.5" /> Demo
          </a>
          <a
            href={project.repoUrl}
            className="flex items-center gap-1.5 transition-colors duration-200 hover:text-neon"
          >
            <Github className="size-3.5" /> Code
          </a>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> {project.comments.length}
          </span>
        </div>
        <button
          type="button"
          aria-pressed={voted}
          aria-label={`Upvote ${project.name}`}
          onClick={() => toggle(project.slug)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tabular-nums transition-colors duration-200 ${
            voted
              ? "border-neon/50 bg-neon/10 text-neon"
              : "border-white/10 text-white/70 hover:border-neon/50 hover:text-neon"
          }`}
        >
          <ChevronUp className="size-3.5" /> {votes}
        </button>
      </div>
    </article>
  );
}
