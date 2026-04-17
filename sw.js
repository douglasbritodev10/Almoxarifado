const CACHE_NAME = 'almoxarifado-v1';
const assets = [
  './',
  './index.html',
  './css/style.css',
  './js/auth.js',
  './js/config.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
