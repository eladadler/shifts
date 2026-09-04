/* ===== Service Worker — משמרות ===== */
const CACHE = 'mishmarot-sw-v1';
const SB_URL = 'https://ajniglpdgkwnasuslsyc.supabase.co';
const SB_KEY = 'sb_publishable_zMTTfShJSVqKaGRYlYoqFA_9y_5Q5hk';

// ---- Install: cache main page ----
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./עובד.html', './icon.svg'])).catch(() => {})
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ---- Fetch: network-first, offline fallback ----
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return; // don't intercept Supabase
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./עובד.html')))
  );
});

// ---- Push: read emp_id from IDB, fetch pending notifications, show them ----
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    const empId = await idbGet('empId');
    if (!empId) return;
    await fetchAndShowNotifications(empId);
  })());
});

async function fetchAndShowNotifications(empId) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/pending_notifications?emp_id=eq.${empId}&shown_at=is.null&order=created_at.asc`,
      { headers: { apikey: SB_KEY, Accept: 'application/json' } }
    );
    if (!res.ok) return;
    const rows = await res.json();

    for (const n of rows) {
      await self.registration.showNotification(n.title, {
        body: n.body,
        icon: './icon.svg',
        badge: './icon.svg',
        tag: n.id,
        renotify: false,
        data: { url: './עובד.html', notifId: n.id },
      });
      // mark as shown
      fetch(`${SB_URL}/rest/v1/pending_notifications?id=eq.${n.id}`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ shown_at: new Date().toISOString() }),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[SW] fetchAndShowNotifications error:', err);
  }
}

// ---- Periodic Sync: fallback for devices without server push ----
self.addEventListener('periodicsync', e => {
  if (e.tag === 'shift-check') {
    e.waitUntil((async () => {
      const empId = await idbGet('empId');
      if (empId) await fetchAndShowNotifications(empId);
    })());
  }
});

// ---- Notification click: open/focus the app ----
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './עובד.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const match = cls.find(w => w.url.includes('עובד'));
      return match ? match.focus() : clients.openWindow(url);
    })
  );
});

// ---- IndexedDB helpers ----
function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('mishmarot', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });
  } catch { return null; }
}
