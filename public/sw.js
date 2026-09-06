// Minimal service worker for web push notifications.
// Registration + permission request lives in src/lib/push-notifications.ts.
//
// Server-side app actions deliver the push events; this worker displays them
// and opens the relevant in-app destination when the user taps one.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Leaderboard", body: "You have a new notification." };
  if (event.data) {
    try {
      const incoming = event.data.json();
      // The app encrypts Web Push payloads with a small `data` envelope.
      // Accept both the envelope and a flat payload for browser compatibility.
      payload = { ...payload, ...(incoming.data ?? incoming) };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  const url = new URL(target, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).href === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
