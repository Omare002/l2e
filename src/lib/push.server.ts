/**
 * Server-only Web Push delivery.
 *
 * Runs inside the app's server runtime (no edge function, no database secret):
 * whenever a server function creates a notification-worthy event, it calls
 * `sendPushToUser`, which looks up the recipient's stored subscriptions and
 * sends a real Web Push message signed with the app's VAPID key pair.
 *
 * Privacy: payloads only ever carry the actor's display name, the event type
 * and a destination path. Message bodies, comment text and any other private
 * content are deliberately never included.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";

export type PushEvent =
  | { kind: "new_follower"; actorName: string; url: string }
  | { kind: "project_upvoted"; actorName: string; url: string }
  | { kind: "message_received"; actorName: string; url: string }
  | { kind: "collaborator_invited"; actorName: string; url: string };

const TITLES: Record<PushEvent["kind"], (actor: string) => string> = {
  new_follower: (a) => `${a} started following you`,
  project_upvoted: (a) => `${a} upvoted your project`,
  message_received: (a) => `New message from ${a}`,
  collaborator_invited: (a) => `${a} invited you to a quest`,
};

const BODIES: Record<PushEvent["kind"], string> = {
  new_follower: "Open Leaderboard to see their profile.",
  project_upvoted: "Your project climbed the board.",
  // Never include message contents in a push payload.
  message_received: "Open Leaderboard to read it.",
  collaborator_invited: "Open Leaderboard to accept or decline.",
};

/**
 * Best-effort push fan-out. Never throws: a failed push must not break the
 * action that triggered it, and in-app notifications are already persisted by
 * database triggers regardless of push state.
 */
export async function sendPushToUser(userId: string, event: PushEvent): Promise<void> {
  try {
    const vapid = {
      subject: process.env["VAPID_SUBJECT"],
      publicKey: process.env["VAPID_PUBLIC_KEY"],
      privateKey: process.env["VAPID_PRIVATE_KEY"],
    };
    if (!vapid.subject || !vapid.publicKey || !vapid.privateKey) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs || subs.length === 0) return;

    const payload = {
      data: {
        title: TITLES[event.kind](event.actorName),
        body: BODIES[event.kind],
        url: event.url,
        type: event.kind,
      },
      options: { ttl: 60 * 60 * 24 },
    };

    await Promise.all(
      subs.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          const request = await buildPushPayload(payload, subscription, vapid);
          const response = await fetch(sub.endpoint, {
            method: request.method,
            headers: request.headers,
            body: request.body as unknown as BodyInit,
          });
          // 404/410 mean the browser dropped this subscription for good.
          if (response.status === 404 || response.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          } else if (!response.ok) {
            console.error("[push] delivery failed", response.status);
          }
        } catch (error) {
          console.error("[push] delivery error", error);
        }
      }),
    );
  } catch (error) {
    console.error("[push] fan-out error", error);
  }
}

/** Display name for a user id, used as the push actor label. */
export async function actorName(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name ?? data?.username ?? "Someone";
}
