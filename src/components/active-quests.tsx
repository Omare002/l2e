import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { SkeletonLines } from "@/components/skeleton-block";
import { useAuth } from "@/hooks/use-auth";
import { myProjectsQuery } from "@/lib/db";
import {
  QUEST_KIND_LABEL,
  type QuestKind,
  myQuestsQuery,
  questKeys,
  timeLeft,
} from "@/lib/quests";
import { leaveQuest, respondToQuest, submitQuestProject } from "@/lib/quests.functions";

/**
 * "My quests": every quest the member accepted or was invited to, with the
 * deadline, what the task asks for, their submission and a clear way to enter
 * a project — existing or brand new. Additive and quiet on failure.
 */
export function ActiveQuests() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(myQuestsQuery(userId));
  const mine = useQuery({ ...myProjectsQuery(userId ?? ""), enabled: Boolean(userId) });
  const runSubmit = useServerFn(submitQuestProject);
  const runRespond = useServerFn(respondToQuest);
  const runLeave = useServerFn(leaveQuest);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: questKeys.mine(userId ?? "anon") });
    void queryClient.invalidateQueries({ queryKey: questKeys.all });
    void queryClient.invalidateQueries({ queryKey: questKeys.history(userId ?? "anon") });
  };

  const submit = useMutation({
    mutationFn: (input: { questId: string; projectId: string }) =>
      runSubmit({ data: { questId: input.questId, projectId: input.projectId } }),
    onSuccess: () => {
      refresh();
      toast.success("Project submitted to the quest");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit your project"),
  });

  const respond = useMutation({
    mutationFn: (input: { questId: string; action: "accept" | "decline" }) =>
      runRespond({ data: { questId: input.questId, action: input.action } }),
    onSuccess: (r) => {
      refresh();
      toast.success(r.status === "declined" ? "Invitation declined" : "Quest is active");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update your answer"),
  });

  const leave = useMutation({
    mutationFn: (questId: string) => runLeave({ data: { questId } }),
    onSuccess: () => {
      refresh();
      toast.success("You left the quest");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not leave this quest"),
  });

  if (isError) return null;

  const rows = (data ?? []).filter((r) => r.quest && r.status !== "declined");
  const live = rows
    .filter((r) => !r.quest!.closed_at && new Date(r.quest!.ends_at) > new Date())
    .sort((a, b) => new Date(a.quest!.ends_at).getTime() - new Date(b.quest!.ends_at).getTime());

  return (
    <section className="mt-14 sm:mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">My quests</h2>
        <Link to="/quests" className="font-mono text-[11px] text-muted-foreground hover:text-neon">
          All quests →
        </Link>
      </div>

      {isLoading && live.length === 0 ? (
        <SkeletonLines rows={2} className="mt-5 p-4 sm:p-5" />
      ) : live.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted-foreground">
          No active quests —{" "}
          <Link to="/quests" className="underline underline-offset-4 hover:text-neon">
            enter one
          </Link>{" "}
          and submit a project before the deadline.
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {live.map((row) => {
            const q = row.quest!;
            const locked = Boolean(q.closed_at) || new Date(q.ends_at) <= new Date();
            const accepted = row.status === "accepted";
            return (
              <article key={row.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="glass-pill-dark px-2.5 py-1 font-mono text-[10px] text-on-dark">
                    {QUEST_KIND_LABEL[q.kind as QuestKind] ?? "Quest"}
                  </span>
                  <span
                    className={`glass-pill-dark px-2.5 py-1 font-mono text-[10px] ${
                      accepted ? "text-neon" : "text-on-dark-muted"
                    }`}
                  >
                    {accepted ? "Active" : "Invitation pending"}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-on-dark-muted">
                    <CalendarClock className="size-3" />
                    {timeLeft(q.ends_at)} · {new Date(q.ends_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <Link
                  to="/quests/$id"
                  params={{ id: q.id }}
                  className="mt-4 block text-[15px] font-semibold tracking-tight text-on-dark transition-colors duration-200 hover:text-neon"
                >
                  {q.title}
                </Link>
                {q.task ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-on-dark-muted">
                    <span className="font-mono text-[11px]">Task: {q.task.title}</span>
                    {q.task.prompt ? ` — ${q.task.prompt}` : null}
                  </p>
                ) : q.description ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-on-dark-muted">
                    {q.description}
                  </p>
                ) : null}

                {!accepted ? (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ questId: q.id, action: "accept" })}
                      className="min-h-11 rounded-full bg-neon px-5 text-[13px] font-semibold text-background transition-opacity duration-200 hover:opacity-85 disabled:opacity-50"
                    >
                      Accept quest
                    </button>
                    <button
                      type="button"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ questId: q.id, action: "decline" })}
                      className="glass-pill-dark min-h-11 px-5 text-[13px] text-on-dark-muted transition-colors duration-200 hover:text-on-dark"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    {row.project ? (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-on-dark">
                        <CheckCircle2 className="size-3.5 text-neon" />
                        Submitted:{" "}
                        <Link
                          to="/projects/$slug"
                          params={{ slug: row.project.slug }}
                          className="font-medium underline underline-offset-4 hover:text-neon"
                        >
                          {row.project.title}
                        </Link>
                        <span className="font-mono text-[10px] text-on-dark-muted">
                          {row.submitted_at
                            ? `on ${new Date(row.submitted_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}`
                            : null}
                          {row.project.published ? "" : " · draft"}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-on-dark-muted">
                        No project submitted yet.
                      </p>
                    )}

                    {q.creator_id !== userId ? (
                      <button
                        type="button"
                        disabled={leave.isPending}
                        onClick={() => {
                          const msg = row.project_id
                            ? "You already submitted a project to this quest. Leaving removes your entry from the standings — your project itself is kept. Leave the quest?"
                            : "Leave this quest? You can enter again while it's open.";
                          if (window.confirm(msg)) leave.mutate(q.id);
                        }}
                        className="glass-pill-dark mt-3 min-h-10 px-4 text-[12px] text-on-dark-muted transition-colors duration-200 hover:text-red-400 disabled:opacity-60"
                      >
                        Leave quest
                      </button>
                    ) : null}

                    {locked ? (
                      <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-on-dark-muted">
                        <Lock className="size-3" /> Submissions are locked
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <select
                          aria-label={`Submit a project to ${q.title}`}
                          value={row.project_id ?? ""}
                          disabled={submit.isPending}
                          onChange={(e) =>
                            e.target.value &&
                            submit.mutate({ questId: q.id, projectId: e.target.value })
                          }
                          className="min-h-11 w-full rounded-lg border border-white/[0.12] bg-transparent px-3 text-[13px] text-on-dark outline-none focus-visible:border-neon"
                        >
                          <option value="">
                            {row.project ? "Change your entry…" : "Submit an existing project…"}
                          </option>
                          {(mine.data ?? []).map((p) => (
                            <option key={p.id ?? p.title} value={p.id ?? ""}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <Link
                          to="/submit"
                          search={{ quest: q.id }}
                          className="glass-pill-dark inline-flex min-h-11 items-center justify-center px-4 text-[12px] text-on-dark transition-colors duration-200 hover:text-neon"
                        >
                          New project for this quest
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
