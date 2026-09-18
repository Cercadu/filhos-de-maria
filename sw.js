const CACHE_VERSION = "afim-v4";
const APP_SHELL = [
  "/",
  "/index.html",
  "/liturgia.html",
  "/oracao.html",
  "/inscricao.html",
  "/offline.html",
  "/css/style.css",
  "/js/app.js",
  "/js/api.js",
  "/js/home.js",
  "/js/liturgia.js",
  "/js/oracao.js",
  "/manifest.json",
  "/assets/img/logo.png",
  "/assets/img/logo-badge.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API: sempre tenta rede primeiro (dados dinâmicos), sem cache de fallback de conteúdo sensível
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: "offline" }), {
        headers: { "content-type": "application/json" },
        status: 503,
      }))
    );
    return;
  }

  // Navegação de páginas e código (JS/CSS): network-first, com fallback pro cache
  // quando offline. Evita servir JS/CSS desatualizados caso alguém esqueça de
  // bumpar CACHE_VERSION num deploy - o código sempre tenta a rede primeiro.
  const isCode = url.pathname.endsWith(".js") || url.pathname.endsWith(".css");
  if (request.mode === "navigate" || isCode) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || (request.mode === "navigate" ? caches.match("/offline.html") : undefined)))
    );
    return;
  }

  // Demais estáticos (imagens, ícones, manifest): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
