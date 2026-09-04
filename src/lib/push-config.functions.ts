import { createServerFn } from "@tanstack/react-start";

/**
 * Exposes the app's VAPID *public* key to the browser so it can create a push
 * subscription. Public by design — the private half never leaves the server.
 */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});
