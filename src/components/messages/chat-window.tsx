import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Ban, Check, Flag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { MessageBody } from "@/components/messages/message-body";
import { MessageComposer } from "@/components/messages/message-composer";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { relativeTime } from "@/lib/display";
import type { ConversationView, MessageRow } from "@/lib/messaging";
import {
  markConversationRead,
  reportConversation,
  respondToRequest,
  sendMessage,
  setBlocked,
} from "@/lib/messaging.functions";

type Props = {
  conversation: ConversationView;
  messages: MessageRow[];
  userId: string;
  onBack: () => void;
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  if (same) return "Today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatWindow({ conversation, messages, userId, onBack }: Props) {
  const queryClient = useQueryClient();
  const scroller = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { partnerOnline, partnerTyping, notifyTyping } = useChatPresence(conversation.id, userId);

  const runSend = useServerFn(sendMessage);
  const runRespond = useServerFn(respondToRequest);
  const runRead = useServerFn(markConversationRead);
  const runBlock = useServerFn(setBlocked);
  const runReport = useServerFn(reportConversation);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const send = useMutation({
    mutationFn: (payload: { body: string; imagePath: string | null }) =>
      runSend({
        data: {
          conversationId: conversation.id,
          body: payload.body,
          imagePath: payload.imagePath,
        } as never,
      }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send that message"),
  });

  const respond = useMutation({
    mutationFn: (action: "accept" | "decline" | "block") =>
      runRespond({ data: { conversationId: conversation.id, action } as never }),
    onSuccess: (_d, action) => {
      toast.success(
        action === "accept" ? "Request accepted" : action === "block" ? "Member blocked" : "Request declined",
      );
      refresh();
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update that request"),
  });

  // Mark as read whenever new messages land while the thread is open.
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastId) return;
    void runRead({ data: { conversationId: conversation.id } as never }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [lastId, conversation.id, runRead, queryClient]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, partnerTyping]);

  const grouped = useMemo(() => {
    const out: { day: string; items: MessageRow[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const bucket = out[out.length - 1];
      if (bucket && bucket.day === day) bucket.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const partner = conversation.partner;
  const declined = conversation.status === "declined";
  const awaitingThem = conversation.status === "pending" && conversation.isRequester;
  const myLastSent = [...messages].reverse().find((m) => m.sender_id === userId);
  const seen =
    myLastSent && conversation.theirReadAt
      ? new Date(conversation.theirReadAt) >= new Date(myLastSent.created_at)
      : false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex size-9 items-center justify-center rounded-full border border-border transition-colors duration-200 hover:border-neon md:hidden"
        >
          <ArrowLeft className="size-4" />
        </button>

        <span className="relative">
          <UserAvatar
            name={partner?.display_name}
            path={partner?.avatar_url}
            accent={partner?.accent_color}
            size={36}
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${
              partnerOnline ? "bg-neon" : "bg-muted-foreground/50"
            }`}
            aria-label={partnerOnline ? "Online" : "Offline"}
          />
        </span>

        <div className="min-w-0 flex-1">
          <Link
            to="/builders/$username"
            params={{ username: partner?.username ?? "" }}
            className="block truncate text-[14px] font-medium transition-colors duration-200 hover:text-neon"
          >
            {partner?.display_name ?? "Member"}
          </Link>
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {partnerTyping ? "typing…" : partnerOnline ? "online" : `@${partner?.username ?? ""}`}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Conversation options"
            className="flex size-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  const reason = window.prompt("What's wrong with this conversation?");
                  if (!reason) return;
                  try {
                    await runReport({ data: { conversationId: conversation.id, reason } as never });
                    toast.success("Report sent. Thank you.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not send that report");
                  }
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors duration-200 hover:bg-muted"
              >
                <Flag className="size-3.5" /> Report conversation
              </button>
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  if (!partner) return;
                  try {
                    await runBlock({ data: { userId: partner.id, action: "block" } as never });
                    toast.success(`Blocked ${partner.display_name}`);
                    refresh();
                    queryClient.invalidateQueries({ queryKey: ["blocks"] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not block that member");
                  }
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-[13px] transition-colors duration-200 hover:bg-muted"
              >
                <Ban className="size-3.5" /> Block member
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {conversation.project ? (
        <div className="border-b border-border bg-muted/40 px-4 py-2.5 sm:px-5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Regarding
          </div>
          <Link
            to="/projects/$slug"
            params={{ slug: conversation.project.slug }}
            className="text-[13px] font-medium transition-colors duration-200 hover:text-neon"
          >
            {conversation.project.title}
          </Link>
        </div>
      ) : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            {conversation.isRequester
              ? "Send the first message to start this request."
              : "No messages yet."}
          </p>
        ) : null}

        {grouped.map((group) => (
          <div key={group.day}>
            <div className="my-4 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {group.day}
            </div>
            <div className="flex flex-col gap-2.5">
              {group.items.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] ${
                        mine
                          ? "bg-foreground text-background"
                          : "border border-border bg-background text-foreground"
                      }`}
                    >
                      <MessageBody body={m.body} imagePath={m.image_path} />
                      <div
                        className={`mt-1 font-mono text-[10px] ${
                          mine ? "text-background/60" : "text-muted-foreground"
                        }`}
                      >
                        {relativeTime(m.created_at)}
                        {mine && m.id === myLastSent?.id && seen ? " · Seen" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {partnerTyping ? (
          <div className="mt-3 flex items-center gap-1.5 pl-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {conversation.needsMyAnswer ? (
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <p className="text-[13px] text-muted-foreground">
            {partner?.display_name} sent you a message request.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => respond.mutate("accept")}
              disabled={respond.isPending}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity duration-200 hover:opacity-90"
            >
              <Check className="size-3.5" /> Accept
            </button>
            <button
              type="button"
              onClick={() => respond.mutate("decline")}
              disabled={respond.isPending}
              className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-[13px] transition-colors duration-200 hover:border-neon"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => respond.mutate("block")}
              disabled={respond.isPending}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] text-muted-foreground transition-colors duration-200 hover:border-neon hover:text-foreground"
            >
              <Ban className="size-3.5" /> Block
            </button>
          </div>
        </div>
      ) : declined ? (
        <div className="border-t border-border px-4 py-5 text-center text-[13px] text-muted-foreground sm:px-5">
          This conversation is closed.
        </div>
      ) : (
        <MessageComposer
          userId={userId}
          sending={send.isPending}
          onTyping={notifyTyping}
          onSend={async (payload) => {
            await send.mutateAsync(payload);
          }}
          placeholder={
            awaitingThem ? "Message request — say hello…" : `Message ${partner?.display_name ?? ""}…`
          }
        />
      )}
    </div>
  );
}
