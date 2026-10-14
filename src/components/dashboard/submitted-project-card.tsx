import { Link } from "@tanstack/react-router";
import { Edit, Lock, Trash2, Unlock, MessageSquare, ChevronUp } from "lucide-react";
import type { ProjectStats } from "@/lib/db";
import { normalizeCategory, statusLabel } from "@/data/community";
import { Button } from "@/components/ui/button";
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
      className="surface-card lift-hover group flex flex-col p-5 sm:p-6"
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 flex-1">
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug ?? "" }}
            className="block text-lg font-semibold leading-snug tracking-normal text-on-dark transition-colors duration-200 hover:text-neon"
          >
            {title}
          </Link>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium leading-none tracking-wide",
            isPublic
              ? "border border-neon/30 bg-neon/10 text-neon"
              : "border border-card-border bg-card-subtle text-card-muted",
          )}
          aria-label={isPublic ? "Public project" : "Private project"}
        >
          {isPublic ? "Public" : "Private"}
        </span>
      </div>

      {/* Description */}
      {tagline ? (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-card-muted">
          {tagline}
        </p>
      ) : (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-card-muted italic">
          No description provided.
        </p>
      )}

      {/* Metadata strip */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-card-border pt-4 text-[13px] text-card-muted">
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
        <Button asChild variant="cardPrimary" size="card">
          <Link to="/submit" search={{ id: project.id ?? undefined }}>
            <Edit aria-hidden /> Edit
          </Link>
        </Button>
        <Button variant="cardSecondary" size="card" type="button" disabled={isVisibilityPending} onClick={onToggleVisibility}>
          {isPublic ? <Lock aria-hidden /> : <Unlock aria-hidden />}
          {isPublic ? "Make private" : "Make public"}
        </Button>
        <Button variant="cardDestructive" size="card" type="button" onClick={onDeleteRequest}>
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>

      {/* Helper note for private projects */}
      {!isPublic ? (
        <p className="mt-3 text-xs leading-snug text-card-muted">
          Hidden from the showcase, search and the leaderboard. Your upvotes are kept.
        </p>
      ) : null}
    </article>
  );
}
