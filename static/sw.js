self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('periodipal-v1').then(cache => {
      return cache.addAll([
        '/',
        '/offline',
        '/static/css/style.css',
        '/static/js/app.js',
        '/static/audio/bg-music.mp3',
        '/static/img/icon-192.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(res => res || caches.match('/offline'))
    )
  );
});
