import { Link } from "@tanstack/react-router";
import { Edit, Lock, Trash2, Unlock, MessageSquare, ChevronUp } from "lucide-react";
import type { ProjectStats } from "@/lib/db";
import { normalizeCategory, statusLabel } from "@/data/community";
import { cn } from "@/lib/utils";

interface SubmittedProjectCardProps {
  project: ProjectStats;
  isVisibilityPending?: boolean;
  onToggleVisibility: () => void;
  onDeleteRequest: () => void;
}

export function SubmittedProjectCard({
  project,
  isVisibilityPending,
  onToggleVisibility,
  onDeleteRequest,
}: SubmittedProjectCardProps) {
  const title = project.title ?? "Untitled project";
  const tagline = project.tagline ?? "";
  const isPublic = project.published;
  const voteCount = project.vote_count ?? 0;
  const commentCount = project.comment_count ?? 0;

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-white/[0.08] bg-surface-darker/90 p-5 sm:p-6",
        "shadow-[0_1px_2px_-1px_oklch(0_0_0/4%),0_3px_8px_-3px_oklch(0_0_0/6%)]",
        "transition-all duration-200 ease-out",
        "hover:border-neon/25 hover:bg-surface-darker hover:shadow-[0_1px_2px_-1px_oklch(0_0_0/4%),0_6px_16px_-6px_oklch(0_0_0/12%)]",
        "hover:-translate-y-0.5",
      )}
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 flex-1">
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug ?? "" }}
            className="block truncate text-[17px] font-semibold leading-tight tracking-tight text-on-dark transition-colors duration-200 group-hover:text-neon"
          >
            {title}
          </Link>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium leading-none tracking-wide",
            isPublic
              ? "border border-neon/30 bg-neon/10 text-neon"
              : "border border-white/10 bg-white/[0.05] text-on-dark-muted",
          )}
          aria-label={isPublic ? "Public project" : "Private project"}
        >
          {isPublic ? "Public" : "Private"}
        </span>
      </div>

      {/* Description */}
      {tagline ? (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
          {tagline}
        </p>
      ) : (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground/60 italic">
          No description provided.
        </p>
      )}

      {/* Metadata strip */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-[12px] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1.5 font-mono">
          <ChevronUp className="size-3.5 text-neon" aria-hidden />
          {voteCount.toLocaleString()} upvote{voteCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono">
          <MessageSquare className="size-3.5" aria-hidden />
          {commentCount.toLocaleString()} comment{commentCount === 1 ? "" : "s"}
        </span>
        <span className="font-mono">{normalizeCategory(project.category)}</span>
        <span className="font-mono">{statusLabel(project.status ?? "shipped")}</span>
      </div>

      {/* Action row */}
      <div className="mt-auto pt-5 flex flex-wrap items-center gap-2.5">
        <Link
          to="/submit"
          search={{ id: project.id ?? undefined }}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-medium transition-colors duration-200",
            "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <Edit className="size-3.5" aria-hidden />
          Edit
        </Link>

        <button
          type="button"
          disabled={isVisibilityPending}
          onClick={onToggleVisibility}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[12px] font-medium transition-colors duration-200 disabled:opacity-60",
            "border-white/10 bg-white/[0.04] text-on-dark hover:border-neon/40 hover:bg-neon/5 hover:text-neon",
          )}
        >
          {isPublic ? (
            <>
              <Lock className="size-3.5" aria-hidden /> Make private
            </>
          ) : (
            <>
              <Unlock className="size-3.5" aria-hidden /> Make public
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDeleteRequest}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-medium transition-colors duration-200",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </button>
      </div>

      {/* Helper note for private projects */}
      {!isPublic ? (
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground/70">
          Hidden from the showcase, search and the leaderboard. Your upvotes are kept.
        </p>
      ) : null}
    </article>
  );
}
