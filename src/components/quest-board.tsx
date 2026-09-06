import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SkeletonLines } from "@/components/skeleton-block";
import { QUEST_KIND_LABEL, type QuestKind, questsQuery, timeLeft } from "@/lib/quests";

/**
 * Quests alongside the weekly race. Purely additive: if quests fail to load the
 * rest of the leaderboard is untouched and this section simply stays quiet.
 */
export function QuestBoard({ limit = 6 }: { limit?: number }) {
  const { data, isLoading, isError } = useQuery(questsQuery());
  if (isError) return null;

  const quests = (data ?? []).slice(0, limit);

  return (
    <div className="mt-14 sm:mt-16">
      <SectionHeading
        title="Quests"
        subtitle="Side races running alongside the week: deadline, who joined, and who took it."
      />

      {isLoading && quests.length === 0 ? (
        <SkeletonLines rows={3} className="p-4 sm:p-5" />
      ) : quests.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No quests yet —{" "}
          <Link to="/quests" className="underline underline-offset-4 hover:text-neon">
            start one
          </Link>{" "}
          and invite a few builders.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quests.map((q) => {
            const accepted = (q.participants ?? []).filter((p) => p.status === "accepted").length;
            const finished = Boolean(q.closed_at) || new Date(q.ends_at) <= new Date();
            return (
              <Link
                key={q.id}
                to="/quests/$id"
                params={{ id: q.id }}
                className="surface-card lift-hover block p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="glass-pill px-2.5 py-1 font-mono text-[10px] text-on-dark-muted">
                    {QUEST_KIND_LABEL[q.kind as QuestKind] ?? "Quest"}
                  </span>
                  <span className="font-mono text-[10px] text-on-dark-muted">
                    {finished
                      ? "Finished"
                      : `${timeLeft(q.ends_at)} · ${new Date(q.ends_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-on-dark">
                  {q.title}
                </h3>
                {q.task ? (
                  <p className="mt-1 font-mono text-[11px] text-on-dark-muted">
                    Task: {q.task.title}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[11px] text-on-dark-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {accepted} racing
                  </span>
                  {q.winner ? (
                    <span className="flex items-center gap-1.5 text-neon">
                      <Trophy className="size-3.5" /> {q.winner.display_name} · {q.winner_votes}{" "}
                      upvotes
                    </span>
                  ) : finished ? (
                    <span>No upvoted entries</span>
                  ) : (
                    <span>Winner locks at the deadline</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
