import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { SkeletonLines } from "@/components/skeleton-block";
import { supabase } from "@/integrations/supabase/client";
import { deleteQuestMessage, postQuestMessage } from "@/lib/quests.functions";
import { questChatQuery, questKeys, sinceLabel } from "@/lib/quests";

/**
 * One chat room per quest. Members (creator, invited, joined) can talk about
 * the task, drop links and plan submissions before the deadline. Additive:
 * a chat failure never affects the quest page or its standings.
 */
export function QuestChat({ questId, canPost }: { questId: string; canPost: boolean }) {
  const queryClient = useQueryClient();
  const chat = useQuery(questChatQuery(questId, true));
  const runPost = useServerFn(postQuestMessage);
  const runDelete = useServerFn(deleteQuestMessage);
  const [body, setBody] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: questKeys.chat(questId) });

  useEffect(() => {
    const channel = supabase
      .channel(`quest-chat-${questId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quest_messages", filter: `quest_id=eq.${questId}` },
        () => invalidate(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  const messages = chat.data ?? [];

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (text: string) => runPost({ data: { questId, body: text } }),
    onSuccess: () => {
      setBody("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send that message"),
  });

  const remove = useMutation({
    mutationFn: (messageId: string) => runDelete({ data: { messageId } }),
    onSuccess: invalidate,
    onError: () => toast.error("Could not delete this message"),
  });

  if (chat.isError) return null;

  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-medium">
        Quest chat <span className="text-muted-foreground">· members only</span>
      </h2>

      <div className="surface-card mt-4 overflow-hidden">
        <div
          ref={scroller}
          className="max-h-[22rem] overflow-y-auto px-4 py-4 sm:px-5"
          aria-live="polite"
        >
          {chat.isLoading && messages.length === 0 ? (
            <SkeletonLines rows={3} />
          ) : messages.length === 0 ? (
            <p className="py-4 text-[13px] text-on-dark-muted">
              No messages yet. Share your plan, drop a link, or ask for feedback.
            </p>
          ) : (
            <ul className="grid gap-4">
              {messages.map((m) => (
                <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <UserAvatar
                    name={m.author?.display_name ?? "Builder"}
                    path={m.author?.avatar_url ?? null}
                    accent={m.author?.accent_color ?? "#9BE564"}
                    size={28}
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      {m.author ? (
                        <Link
                          to="/builders/$username"
                          params={{ username: m.author.username }}
                          className="truncate text-[13px] font-medium text-on-dark hover:text-neon"
                        >
                          {m.author.display_name}
                        </Link>
                      ) : (
                        <span className="text-[13px] font-medium text-on-dark">Builder</span>
                      )}
                      <span className="font-mono text-[10px] text-on-dark-muted">
                        {sinceLabel(m.created_at)}
                      </span>
                      {m.mine ? (
                        <button
                          type="button"
                          onClick={() => remove.mutate(m.id)}
                          aria-label="Delete message"
                          className="text-on-dark-muted transition-colors duration-200 hover:text-neon"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 break-words text-[13px] leading-relaxed text-on-dark-muted">
                      {m.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canPost ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = body.trim();
              if (text) send.mutate(text);
            }}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t border-white/[0.06] px-4 py-3 sm:px-5"
          >
            <label className="sr-only" htmlFor="quest-chat-body">
              Message the quest
            </label>
            <textarea
              id="quest-chat-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const text = body.trim();
                  if (text) send.mutate(text);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Share a link or plan your submission…"
              className="min-h-11 resize-none rounded-lg border border-border bg-transparent px-3 py-3 text-[13px] outline-none focus-visible:border-neon"
            />
            <button
              type="submit"
              disabled={send.isPending || body.trim().length === 0}
              aria-label="Send message"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        ) : (
          <p className="border-t border-white/[0.06] px-4 py-3 text-[12px] text-on-dark-muted sm:px-5">
            Join this quest to post in the chat.
          </p>
        )}
      </div>
    </section>
  );
}
