import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { ChatWindow } from "@/components/messages/chat-window";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { useAuth } from "@/hooks/use-auth";
import { relativeTime } from "@/lib/display";
import { conversationsQuery, decorate, messagesQuery } from "@/lib/messaging";
import { getUnreadCounts, startConversation } from "@/lib/messaging.functions";

type Search = { c?: string; to?: string; project?: string };

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    c: typeof search.c === "string" ? search.c : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    project: typeof search.project === "string" ? search.project : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — Leaderboard" },
      {
        name: "description",
        content: "Private conversations with other LearnToEarn builders: ask questions, give feedback, form teams.",
      },
      { property: "og:title", content: "Messages — Leaderboard" },
      { property: "og:description", content: "Private conversations with other LearnToEarn builders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

type Tab = "inbox" | "requests" | "sent";

function MessagesPage() {
  const { c, to, project } = Route.useSearch();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("inbox");
  const [term, setTerm] = useState("");
  const runStart = useServerFn(startConversation);
  const loadUnreadCounts = useServerFn(getUnreadCounts);

  const list = useQuery(conversationsQuery(userId));
  const unreadCounts = useQuery({
    queryKey: ["unread-counts", userId],
    enabled: Boolean(userId),
    queryFn: () => loadUnreadCounts(),
  });
  const conversations = useMemo(() => {
    return decorate(list.data ?? [], userId, unreadCounts.data ?? {});
  }, [list.data, unreadCounts.data, userId]);

  // Opening a thread from a project, profile, leaderboard or the forum.
  useEffect(() => {
    if (!to || !userId) return;
    void (async () => {
      try {
        const result = (await runStart({
          data: { recipientId: to, projectId: project ?? null } as never,
        })) as { id: string };
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        navigate({ to: "/messages", search: { c: result.id }, replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not open that conversation");
        navigate({ to: "/messages", search: {}, replace: true });
      }
    })();
  }, [to, project, userId, runStart, navigate, queryClient]);

  const active = conversations.find((conv) => conv.id === c) ?? null;
  const messages = useQuery(messagesQuery(active?.id));

  const visible = conversations
    .filter((conv) => {
      if (tab === "requests") return conv.needsMyAnswer;
      if (tab === "sent") return conv.status === "pending" && conv.isRequester;
      return conv.status === "accepted";
    })
    .filter((conv) => {
      const q = term.trim().toLowerCase();
      if (!q) return true;
      return (
        (conv.partner?.display_name ?? "").toLowerCase().includes(q) ||
        (conv.partner?.username ?? "").toLowerCase().includes(q) ||
        (conv.last_message_preview ?? "").toLowerCase().includes(q)
      );
    });

  const counts = {
    inbox: conversations.filter((conv) => conv.status === "accepted" && conv.unread > 0).length,
    requests: conversations.filter((conv) => conv.needsMyAnswer).length,
    sent: 0,
  };

  return (
    <div className="mx-auto max-w-6xl px-0 py-0 sm:px-6 sm:py-10">
      <div className="hidden px-4 pb-6 sm:block sm:px-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Messages</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          Talk directly with other builders about their projects, feedback and collaboration.
        </p>
      </div>

      <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 overflow-hidden border-border sm:h-[70dvh] sm:rounded-xl sm:border md:grid-cols-[320px_minmax(0,1fr)]">
        {/* Conversation list */}
        <aside
          className={`flex min-h-0 flex-col border-border md:flex md:border-r ${
            active ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-full border border-border px-3 transition-colors duration-200 focus-within:border-neon">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search conversations"
                className="min-h-10 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-3 flex gap-1">
              {(["inbox", "requests", "sent"] as Tab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] capitalize transition-colors duration-200 ${
                    tab === key
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key}
                  {counts[key] > 0 ? (
                    <span className="rounded-full bg-neon px-1.5 font-mono text-[10px] text-ink">
                      {counts[key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isLoading && conversations.length === 0 ? (
              <SkeletonLines rows={6} className="p-3" />
            ) : list.isError ? (
              <LoadFailure
                message="Your conversations couldn't load."
                onRetry={() => void list.refetch()}
              />
            ) : visible.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                {tab === "requests"
                  ? "No message requests."
                  : tab === "sent"
                    ? "No pending requests you sent."
                    : "No conversations yet. Message a builder from their project or profile."}
              </div>
            ) : (
              visible.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => navigate({ to: "/messages", search: { c: conv.id } })}
                  className={`flex w-full items-center gap-3 border-b border-border/70 px-3 py-3.5 text-left transition-colors duration-200 hover:bg-muted/50 ${
                    conv.id === active?.id ? "bg-muted/60" : ""
                  }`}
                >
                  <UserAvatar
                    name={conv.partner?.display_name}
                    path={conv.partner?.avatar_url}
                    accent={conv.partner?.accent_color}
                    size={38}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                        {conv.partner?.display_name ?? "Member"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {relativeTime(conv.last_message_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                        {conv.last_message_preview ?? "No messages yet"}
                      </span>
                      {conv.unread > 0 ? <span className="size-2 shrink-0 rounded-full bg-neon" /> : null}
                    </span>
                    {conv.project ? (
                      <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                        re: {conv.project.title}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className={`min-h-0 ${active ? "block" : "hidden md:block"}`}>
          {active && userId ? (
            <ChatWindow
              conversation={active}
              messages={messages.data ?? []}
              userId={userId}
              onBack={() => navigate({ to: "/messages", search: {} })}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <MessageSquare className="size-6 text-muted-foreground" />
              <p className="max-w-xs text-[13px] text-muted-foreground">
                Pick a conversation, or start one from a project page, a builder's profile, the
                leaderboard or the forum.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
