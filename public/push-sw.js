self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "Nova notificação",
      body: event.data ? event.data.text() : "Você tem uma nova notificação.",
    };
  }

  const title = payload.title || "Nova notificação";
  const options = {
    body: payload.body || payload.mensagem || "Você tem uma nova notificação.",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || payload.notificationId || "fitconsult-notification",
    renotify: true,
    silent: false,
    timestamp: payload.timestamp || Date.now(),
    vibrate: payload.vibrate || [160, 80, 160],
    data: {
      url: payload.url || "/",
      notificationId: payload.notificationId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
