// Supabase Edge Function: send-push
//
// Called by the `notifications_push` Postgres trigger (see migration
// 20260825120000_add_push_notifications.sql) via pg_net, once per row
// inserted into public.notifications. Looks up the recipient's stored
// push subscriptions and sends a Web Push message to each one.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — the pair generated for this app;
//     the public half must also be set client-side as VITE_VAPID_PUBLIC_KEY
//   VAPID_SUBJECT                        — e.g. "mailto:you@example.com"
//   PUSH_TRIGGER_SECRET                  — shared out-of-band with the database
//     runtime, so this function only responds to the notification trigger and
//     not arbitrary callers
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// by the Supabase Edge Functions runtime — no need to set them.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const LABELS: Record<string, string> = {
  message_received: "sent you a message",
  message_request: "sent you a message request",
  collaborator_invited: "invited you to collaborate",
  collaborator_accepted: "accepted your collaboration invite",
  collaborator_declined: "declined your collaboration invite",
  new_follower: "started following you",
};

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("PUSH_TRIGGER_SECRET");
  if (!expectedSecret || req.headers.get("x-push-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let notificationId: string | undefined;
  try {
    ({ notification_id: notificationId } = await req.json());
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (!notificationId) return new Response("Missing notification_id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, user_id, type, body, actor:profiles!notifications_actor_id_fkey(display_name)")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notification) return new Response("Notification not found", { status: 404 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response("VAPID secrets not configured", { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const actorName =
    (notification.actor as { display_name?: string } | null)?.display_name ?? "Someone";
  const payload = JSON.stringify({
    title: `${actorName} ${LABELS[notification.type] ?? "sent you a notification"}`,
    body: notification.body ?? "",
    url: "/messages",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent += 1;
      } catch (err) {
        // A gone/expired subscription (browser unregistered, uninstalled, etc.)
        // reports 404/410 — clean it up so future sends don't keep retrying it.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[send-push] delivery failed", statusCode, err);
        }
      }
    }),
  );

  return new Response(JSON.stringify({ sent, total: subs.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
