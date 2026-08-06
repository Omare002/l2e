import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { relativeTime } from "@/lib/display";
import { notificationsQuery } from "@/lib/messaging";
import { markNotificationsRead } from "@/lib/messaging.functions";

const LABELS: Record<string, string> = {
  message_received: "sent you a message",
  message_request: "sent you a message request",
  collaborator_invited: "invited you to collaborate",
  collaborator_accepted: "accepted your collaboration invite",
};

export function NotificationBell() {
  const { userId, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const runRead = useServerFn(markNotificationsRead);
  const { data } = useQuery(notificationsQuery(userId));
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!isAuthenticated) return null;

  async function markAll() {
    await runRead({ data: { id: null } as never });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        className="relative flex size-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-neon" />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-12 z-50 w-[19rem] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <span className="text-[13px] font-medium">Notifications</span>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAll}
                  className="font-mono text-[11px] text-muted-foreground transition-colors duration-200 hover:text-neon"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  Nothing yet.
                </p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    to="/messages"
                    search={n.conversation_id ? { c: n.conversation_id } : {}}
                    onClick={async () => {
                      setOpen(false);
                      if (!n.read_at) {
                        await runRead({ data: { id: n.id } as never });
                        queryClient.invalidateQueries({ queryKey: ["notifications"] });
                      }
                    }}
                    className={`flex items-start gap-3 border-b border-border/70 px-3.5 py-3 transition-colors duration-200 hover:bg-muted/60 ${
                      n.read_at ? "" : "bg-neon-dim/30"
                    }`}
                  >
                    <UserAvatar
                      name={n.actor?.display_name}
                      path={n.actor?.avatar_url}
                      accent={n.actor?.accent_color}
                      size={30}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px]">
                        <span className="font-medium">{n.actor?.display_name ?? "Someone"}</span>{" "}
                        {LABELS[n.type] ?? n.type}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
