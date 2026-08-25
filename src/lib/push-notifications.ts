/**
 * Client-side web push setup: registers the service worker and asks the
 * browser for notification permission.
 *
 * IMPORTANT — this only covers the browser side. To actually deliver a push
 * you still need, on the server:
 *   1. A VAPID key pair (e.g. via `npx web-push generate-vapid-keys`).
 *   2. Somewhere to store each user's PushSubscription (endpoint + keys) —
 *      e.g. a `push_subscriptions` Supabase table.
 *   3. An endpoint (a Supabase edge function is a natural fit here) that
 *      uses the private VAPID key to send a push to a stored subscription.
 * None of that exists in this project yet — this module gets you a
 * subscription object in the browser; wiring it to a server is a separate
 * task.
 */

export type PushSetupResult =
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "granted"; subscription: PushSubscription | null };

/** True if the browser can register service workers and receive push. */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Registers /sw.js and requests notification permission. Must be called
 * from a user gesture (e.g. a button click) — most browsers ignore or block
 * permission prompts fired on page load.
 *
 * `vapidPublicKey` is optional: pass it once you generate a VAPID key pair
 * server-side, and this will also create a PushSubscription. Without it,
 * this only registers the service worker and requests permission.
 */
export async function enablePushNotifications(vapidPublicKey?: string): Promise<PushSetupResult> {
  if (!isPushSupported()) return { status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  if (!vapidPublicKey) {
    return { status: "granted", subscription: null };
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  // TODO: send `subscription` to a server endpoint that stores it against
  // the signed-in user, once that endpoint exists.
  return { status: "granted", subscription };
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}
