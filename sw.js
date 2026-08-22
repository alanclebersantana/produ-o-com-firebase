/* Minha Produção — service worker
   IMPORTANTE: aumente CACHE a cada publicação, senão o Chrome serve a versão antiga. */
const CACHE = 'atelie-v11';
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegação: rede primeiro, cache como reserva (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fontes do Google: cache primeiro, atualiza em segundo plano
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r;
      }).catch(() => hit))
    );
    return;
  }

  // Demais arquivos do app: cache primeiro
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); }
        return r;
      }).catch(() => hit))
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(ls => {
    for (const c of ls) if ('focus' in c) return c.focus();
    if (clients.openWindow) return clients.openWindow('./index.html');
  }));
});
