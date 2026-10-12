// Service worker: guarda la app para usarla sin conexión (primero la red, si falla la caché).
const CACHE = 'pianoclass-v4';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icons/icon.svg', 'icons/icon-192.png',
  'js/music.js', 'js/songs.js', 'js/songs-extra.js', 'js/pitch.js', 'js/midi-import.js', 'js/audio.js',
  'js/input.js', 'js/keyboard.js', 'js/sheet.js', 'js/player.js', 'js/app.js', 'js/learning-ui.js',
  'js/learning/theory.js', 'js/learning/metrics.js', 'js/learning/exercises.js', 'js/learning/curriculum.js', 'js/learning/engine.js',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
);
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
