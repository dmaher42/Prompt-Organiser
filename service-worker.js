const CACHE_NAME = "prompt-vault-cache-v1";
const OFFLINE_URLS = [
  "/Prompt-Organiser/",
  "/Prompt-Organiser/index.html",
  "/Prompt-Organiser/style.css",
  "/Prompt-Organiser/app.js",
  "/Prompt-Organiser/manifest.webmanifest",
  "/Prompt-Organiser/icon-192.png",
  "/Prompt-Organiser/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        // fallback for navigation requests
        if (request.mode === "navigate") {
          return caches.match("/Prompt-Organiser/index.html");
        }
      });
    })
  );
});
