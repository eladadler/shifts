/* ===== Service Worker — משמרות ===== */
const CACHE = 'mishmarot-sw-v2';
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
  if (e.request.url.includes('supabase.co')) return;
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

// ---- Periodic Sync: server push fallback + local upcoming-shift alerts ----
self.addEventListener('periodicsync', e => {
  if (e.tag === 'shift-check') {
    e.waitUntil((async () => {
      const empId = await idbGet('empId');
      if (!empId) return;
      await fetchAndShowNotifications(empId);
      await checkUpcomingShiftNotifications(empId);
    })());
  }
});

// ---- Upcoming-shift notification logic ----
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const WEEKDAY_SHIFTS = [{ id: 'morning', start: '09:00' }, { id: 'evening', start: '09:00' }, { id: 'night', start: '21:00' }];
const WEEKEND_SHIFTS = [{ id: 'morning', start: '07:00' }, { id: 'short', start: '15:00' }, { id: 'night', start: '19:00' }];

function pad2(n) { return String(n).padStart(2, '0'); }
function dateStrOf(dt) { return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`; }
function addDaysStr(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n);
  return dateStrOf(dt);
}
function atTime(s, hm) {
  const [y, m, d] = s.split('-').map(Number);
  const [h, mi] = String(hm).split(':').map(Number);
  return new Date(y, m - 1, d, h, mi, 0, 0);
}

function getBase(dateStr, ss) {
  const wd = dayOfWeek(dateStr);
  if (ss) {
    if (wd === 6) return ss.saturday || ss.weekend || WEEKEND_SHIFTS;
    if (wd === 5) return ss.friday || ss.weekend || WEEKEND_SHIFTS;
    return ss.weekday || WEEKDAY_SHIFTS;
  }
  return (wd === 5 || wd === 6) ? WEEKEND_SHIFTS : WEEKDAY_SHIFTS;
}

// חייב להישאר זהה ל-shiftTypesFor במשבץ: משמרות מיוחדות, ימי המשך, ודריסות פר-מופע
function shiftDefOf(shiftId, dateStr, ss) {
  const special = (ss && ss.special) || [];
  let def = special.find(sp => sp.date === dateStr && sp.id === shiftId);
  if (!def) {
    for (const sp of special) {
      const span = sp.daysSpan || 1;
      for (let i = 1; i < span; i++) {
        if (addDaysStr(sp.date, i) === dateStr && sp.id === shiftId) def = { ...sp, continuation: true, originDate: sp.date };
      }
    }
  }
  if (!def) def = (getBase(dateStr, ss) || []).find(s => s.id === shiftId);
  if (!def) return null;
  const ov = ss && ss._overrides && ss._overrides[def.continuation ? def.originDate : dateStr];
  const o = ov && ov[shiftId];
  if (!o) return def;
  return { ...def, start: o.start || def.start, end: o.end || def.end,
    _startDayOffset: o.startDayOffset || 0, _per: o.per || null };
}

// שעת ההתחלה של העובד הספציפי — מכבדת פיצול משמרת בין עובדים
function personStartMs(shiftId, dateStr, ss, empId) {
  const def = shiftDefOf(shiftId, dateStr, ss);
  if (!def) return atTime(dateStr, '08:00').getTime();
  const baseDay = def._startDayOffset ? addDaysStr(dateStr, def._startDayOffset) : dateStr;
  const blockStart = atTime(baseDay, def.start || '08:00');
  const p = def._per && def._per[empId];
  if (!p || !p.start) return blockStart.getTime();
  const DAY = 864e5;
  const cand = atTime(dateStrOf(blockStart), p.start).getTime();
  let best = cand;
  [cand - DAY, cand + DAY].forEach(c => {
    if (Math.abs(c - blockStart.getTime()) < Math.abs(best - blockStart.getTime())) best = c;
  });
  return best;
}

const SHIFT_LABELS = { morning: 'בוקר', evening: 'בוקר קצר', afternoon: 'צהריים', night: 'לילה', short: 'קצר' };

async function checkUpcomingShiftNotifications(empId) {
  try {
    const prefs = await idbGet('notifPrefs');
    if (!prefs || (!prefs.alert24h && !prefs.alertCustom)) return;

    const now = Date.now();
    const WINDOW_MS = 45 * 60 * 1000; // ±45 min window around target time

    const today = new Date();
    const ym1 = today.toISOString().slice(0, 7);
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const ym2 = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;

    const res = await fetch(
      `${SB_URL}/rest/v1/published_schedules?month=in.(${ym1},${ym2})&select=month,schedule,shift_settings`,
      { headers: { apikey: SB_KEY, Accept: 'application/json' } }
    );
    if (!res.ok) return;
    const rows = await res.json();

    const shownArr = (await idbGet('shownShiftNotifs')) || [];
    const shownSet = new Set(shownArr);
    const newShown = [...shownArr];

    const alerts = [];
    if (prefs.alert24h) alerts.push({ label: '24h', hours: 24 });
    if (prefs.alertCustom && prefs.alertCustomHours > 0)
      alerts.push({ label: `${prefs.alertCustomHours}h`, hours: Number(prefs.alertCustomHours) });

    for (const row of rows) {
      const schedule = row.schedule || {};
      const ss = row.shift_settings || null;

      for (const [dStr, shifts] of Object.entries(schedule)) {
        for (const [shiftId, empIds] of Object.entries(shifts || {})) {
          if (!(empIds || []).includes(empId)) continue;

          const startMs = personStartMs(shiftId, dStr, ss, empId);
          if (startMs < now - WINDOW_MS) continue; // past shift + window

          const shiftLabel = SHIFT_LABELS[shiftId] || shiftId;
          const hoursUntil = Math.round((startMs - now) / 3600000);

          for (const { label, hours } of alerts) {
            const alertMs = startMs - hours * 3600000;
            const key = `${label}:${dStr}:${shiftId}`;
            if (shownSet.has(key)) continue;
            if (now < alertMs - WINDOW_MS || now > alertMs + WINDOW_MS) continue;

            await self.registration.showNotification('תזכורת משמרת', {
              body: `משמרת ${shiftLabel} ב-${dStr}${hoursUntil > 0 ? ` — בעוד כ-${hoursUntil} שעות` : ''}`,
              icon: './icon.svg',
              badge: './icon.svg',
              tag: key,
              data: { url: './עובד.html' },
            });
            newShown.push(key);
            shownSet.add(key);
          }
        }
      }
    }

    if (newShown.length !== shownArr.length) {
      // Prune keys older than 14 days
      const cutoff = new Date(now - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const pruned = newShown.filter(k => {
        const parts = k.split(':');
        return parts.length >= 2 && parts[1] >= cutoff;
      });
      await idbSet('shownShiftNotifs', pruned);
    }
  } catch (err) {
    console.warn('[SW] checkUpcomingShiftNotifications error:', err);
  }
}

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
async function idbSet(key, value) {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = res; tx.onerror = rej;
    });
  } catch { return null; }
}
