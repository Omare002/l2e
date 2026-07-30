import { Link } from "@tanstack/react-router";
import { MessageSquare, ExternalLink, Github, Triangle } from "lucide-react";
import type { Project } from "@/data/community";
import { builderBy } from "@/data/community";
import { useVotes } from "@/hooks/use-votes";

export function ProjectCard({ project, rank }: { project: Project; rank?: number }) {
  const builder = builderBy(project.builder);
  const { toggle, voteCount, hasVoted } = useVotes();
  const votes = voteCount(project.slug);
  const voted = hasVoted(project.slug);
  return (
    <article className="group flex flex-col bg-surface-dark p-5 transition-all duration-200 hover:-translate-y-1 hover:neon-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 items-center justify-center font-mono text-[11px] font-bold text-ink"
            style={{ background: builder?.color ?? "#7CFC00" }}
          >
            {builder?.initials}
          </span>
          <div>
            <Link
              to="/builders/$username"
              params={{ username: project.builder }}
              className="font-mono text-[13px] font-bold text-white hover:text-neon"
            >
              {builder?.name}
            </Link>
            <div className="font-mono text-[11px] text-white/40">
              @{project.builder} · {project.category}
            </div>
          </div>
        </div>
        {rank ? (
          <span className="bg-neon px-2 py-1 font-mono text-[10px] font-bold text-ink">
            RANK #{rank}
          </span>
        ) : null}
      </div>

      <div
        className="mt-4 h-28 w-full border border-white/10"
        style={{
          background: `repeating-linear-gradient(135deg, ${project.thumbTone}22 0 8px, transparent 8px 16px)`,
        }}
        aria-hidden
      />

      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        className="mt-4 font-mono text-lg font-bold text-white group-hover:text-neon"
      >
        {project.name}
      </Link>
      <p className="mt-2 font-mono text-[13px] leading-relaxed text-white/55">
        {project.tagline}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-4 font-mono text-[11px] text-white/45">
          <a href={project.demoUrl} className="flex items-center gap-1 hover:text-neon">
            <ExternalLink className="size-3" /> Demo
          </a>
          <a href={project.repoUrl} className="flex items-center gap-1 hover:text-neon">
            <Github className="size-3" /> Code
          </a>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" /> {project.comments.length}
          </span>
        </div>
        <span className="flex items-center gap-1 border border-white/15 px-3 py-1.5 font-mono text-[11px] font-bold text-white transition-colors group-hover:border-neon group-hover:text-neon">
          <Triangle className="size-3 fill-current" /> {project.votes}
        </span>
      </div>
    </article>
  );
}