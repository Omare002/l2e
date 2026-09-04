import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { relativeTime } from "@/lib/display";
import { notificationsQuery, type NotificationItem } from "@/lib/messaging";
import { markNotificationsRead } from "@/lib/messaging.functions";
import {
  disablePushNotifications,
  enablePushNotifications,
  hasPushSubscription,
  isPushSupported,
} from "@/lib/push-notifications";
import { getPushPublicKey } from "@/lib/push-config.functions";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push-subscriptions.functions";

const LABELS: Record<string, string> = {
  message_received: "sent you a message",
  message_request: "sent you a message request",
  collaborator_invited: "invited you to collaborate",
  collaborator_accepted: "accepted your collaboration invite",
  collaborator_declined: "declined your collaboration invite",
  new_follower: "started following you",
  project_upvoted: "upvoted your project",
};

/** Where clicking a notification should take you. */
function destination(n: NotificationItem): { to: string; search: Record<string, string> } {
  if (n.conversation_id) return { to: "/messages", search: { c: n.conversation_id } };
  if (n.type === "new_follower" && n.actor?.username) {
    return { to: `/builders/${n.actor.username}`, search: {} };
  }
  if (n.type === "project_upvoted" || n.type.startsWith("collaborator")) {
    return { to: "/dashboard", search: {} };
  }
  return { to: "/messages", search: {} };
}

export function NotificationBell() {
  const { userId, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const runRead = useServerFn(markNotificationsRead);
  const runSavePushSubscription = useServerFn(savePushSubscription);
  const runRemovePushSubscription = useServerFn(removePushSubscription);
  const runGetPushPublicKey = useServerFn(getPushPublicKey);
  const { data } = useQuery(notificationsQuery(userId));
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    try {
      if (isPushSupported()) {
        setPushPermission(Notification.permission);
        void hasPushSubscription().then(setPushOn);
      }
    } catch {
      // Some embedded/preview contexts expose serviceWorker + PushManager
      // but still block the Notification API itself (e.g. an iframe
      // without a "notifications" permissions-policy). Never let that
      // take down the notification bell — just skip the push opt-in row.
    }
  }, []);

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

  async function enablePush() {
    setBusy(true);
    try {
      const { publicKey } = await runGetPushPublicKey({} as never);
      if (!publicKey) {
        toast.error("Push notifications aren't configured yet");
        return;
      }
      const result = await enablePushNotifications(publicKey);
      if (result.status === "unsupported") {
        toast.error("This browser doesn't support push notifications");
        return;
      }
      if (result.status === "denied") {
        setPushPermission("denied");
        toast.error("Notifications permission was denied — you'll still get them in the app");
        return;
      }
      const key = (name: string) => {
        const raw = result.subscription.toJSON().keys?.[name];
        if (!raw) throw new Error(`Missing ${name} key`);
        return raw;
      };
      await runSavePushSubscription({
        data: {
          endpoint: result.subscription.endpoint,
          p256dh: key("p256dh"),
          auth: key("auth"),
        },
      } as never);
      setPushPermission("granted");
      setPushOn(true);
      toast.success("Push notifications enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable push notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const endpoint = await disablePushNotifications();
      if (endpoint) await runRemovePushSubscription({ data: { endpoint } } as never);
      setPushOn(false);
      toast.success("Push notifications turned off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not turn push off");
    } finally {
      setBusy(false);
    }
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
            {pushPermission ? (
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3.5 py-2">
                <span className="text-[12px] text-muted-foreground">
                  {pushPermission === "denied"
                    ? "Push blocked by your browser"
                    : pushOn
                      ? "Push notifications on"
                      : "Get notified instantly"}
                </span>
                {pushPermission === "denied" ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={pushOn ? disablePush : enablePush}
                    className="font-mono text-[11px] text-neon transition-colors duration-200 hover:text-foreground disabled:opacity-50"
                  >
                    {pushOn ? "Turn off" : "Enable push"}
                  </button>
                )}
              </div>
            ) : null}
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  Nothing yet.
                </p>
              ) : (
                items.map((n) => {
                  const target = destination(n);
                  return (
                    <Link
                      key={n.id}
                      to={target.to}
                      search={target.search}
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
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
