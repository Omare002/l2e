import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users } from "lucide-react";
import { SkeletonLines } from "@/components/skeleton-block";
import { useAuth } from "@/hooks/use-auth";
import { QUEST_KIND_LABEL, type QuestKind, myQuestHistoryQuery, timeLeft } from "@/lib/quests";

/**
 * Past and running quests for the signed-in member. Additive and quiet: if the
 * quest data fails to load the rest of the dashboard is untouched.
 */
export function QuestHistory() {
  const { userId } = useAuth();
  const { data, isLoading, isError } = useQuery(myQuestHistoryQuery(userId));
  if (isError) return null;

  const rows = data ?? [];

  return (
    <section className="mt-14 sm:mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Quest history</h2>
        <Link to="/quests" className="font-mono text-[11px] text-muted-foreground hover:text-neon">
          All quests →
        </Link>
      </div>

      {isLoading && rows.length === 0 ? (
        <SkeletonLines rows={3} className="mt-5 p-4 sm:p-5" />
      ) : rows.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted-foreground">
          You haven&apos;t joined a quest yet —{" "}
          <Link to="/quests" className="underline underline-offset-4 hover:text-neon">
            start one
          </Link>{" "}
          and invite a few builders.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {rows.map((q) => {
            const accepted = (q.participants ?? []).filter((p) => p.status === "accepted").length;
            const finished = Boolean(q.closed_at) || new Date(q.ends_at) <= new Date();
            return (
              <Link
                key={q.id}
                to="/quests/$id"
                params={{ id: q.id }}
                className="surface-card lift-hover block p-5"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="glass-pill min-w-0 truncate px-2.5 py-1 font-mono text-[10px] text-on-dark-muted">
                    {QUEST_KIND_LABEL[q.kind as QuestKind] ?? "Quest"}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[10px] text-on-dark-muted">
                    {finished
                      ? `Ended ${new Date(q.ends_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
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
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-on-dark-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {accepted} racing
                  </span>
                  <span>
                    {q.my_status === "accepted"
                      ? q.submitted
                        ? "You entered a project"
                        : "You joined · no entry"
                      : q.my_status === "invited"
                        ? "Invitation pending"
                        : "You declined"}
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
    </section>
  );
}
