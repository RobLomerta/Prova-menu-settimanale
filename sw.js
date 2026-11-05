// Service worker: rende l'app utilizzabile offline (strategia network-first).
const CACHE = 'menu-settimanale-v3';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/data/ingredients.js', 'js/data/recipes.js', 'js/data/prep.js', 'js/data/nutrition.js', 'js/data/aliases.js',
  'js/engine/common.js', 'js/engine/diet.js', 'js/engine/planner.js', 'js/engine/shopping.js', 'js/engine/mealprep.js',
  'js/engine/nutrition.js', 'js/engine/plan.js', 'js/engine/week.js',
  'js/vendor/pdfjs/pdf.min.js', 'js/vendor/pdfjs/pdf.worker.min.js',
  'js/vendor/anthropic/anthropic-sdk.mjs', 'js/ai/claude.js', 'js/ui/assistant.js',
  'js/ui/util.js', 'js/ui/piano.js', 'js/ui/lab.js', 'js/ui/stats.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
