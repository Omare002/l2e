/**
 * Client-side web push setup: registers the service worker, asks the
 * browser for notification permission, and creates a PushSubscription.
 *
 * This only covers the browser side — persisting the subscription against
 * the signed-in user happens in the calling component via the
 * `savePushSubscription` server function (src/lib/push-subscriptions.functions.ts),
 * since server functions need to be invoked through `useServerFn`, which is a
 * hook and can't be called from this plain module. Delivery itself is handled
 * server-side in src/lib/push.server.ts, called from the server functions
 * behind follows, upvotes, messages and quest invitations.
 */

export type PushSetupResult =
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "granted"; subscription: PushSubscription };

/** True if the browser can register service workers and receive push. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Registers /sw.js, requests notification permission, and subscribes to
 * push with the given VAPID public key. Must be called from a user gesture
 * (e.g. a button click) — most browsers ignore or block permission prompts
 * fired on page load. The caller is responsible for persisting the returned
 * subscription server-side (see savePushSubscription).
 */
export async function enablePushNotifications(vapidPublicKey: string): Promise<PushSetupResult> {
  if (!isPushSupported()) return { status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  return { status: "granted", subscription };
}

/**
 * Unsubscribes this browser from push. Returns the endpoint that was removed
 * so the caller can delete the matching row server-side, or null when this
 * browser had no active subscription.
 */
export async function disablePushNotifications(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}

/** True when this browser currently holds an active push subscription. */
export async function hasPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  return Boolean(await registration?.pushManager.getSubscription());
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}
