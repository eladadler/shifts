/* ===== גרסת פיתוח — "קריאה בלבד" =====
 * נטען רק בקבצים שבתיקיית dev/, ראשון בעמוד (לפני כל קוד אחר).
 * המטרה: לפתח ולבדוק שינויים פונקציונליים/עיצוביים על הנתונים האמיתיים, בלי שום אפשרות לשנות אותם.
 *
 * 1. כל בקשת רשת שאינה קריאה (POST/PATCH/PUT/DELETE) נחסמת ומקבלת תשובה מדומה — חוץ מהתחברות
 *    (Supabase Auth) ומפונקציית ה-AI. כך לא נכתב כלום למסד, לא נשלחות התראות ולא מתבצעים חילופים.
 * 2. localStorage מופרד מהגרסה הראשית (אותו דומיין!) — כל מפתח מקבל קידומת "dev:", חוץ מחיבור
 *    המשתמש של Supabase (מפתחות sb-...), כדי שההתחברות תהיה משותפת.
 * 3. לא נרשם service worker ולא נוצר מנוי להתראות.
 * 4. פס עליון קטן מזכיר שזו גרסת פיתוח וסופר כמה כתיבות נחסמו.
 *
 * באיחוד לגרסה הראשית (dev/README.md) הקובץ הזה לא עובר — רק ה-HTML, בלי השורה שטוענת אותו.
 */
(function () {
  'use strict';
  var BLOCKED_MSG = 'גרסת פיתוח — קריאה בלבד: הפעולה לא נשמרה';
  var blocked = 0;

  // ---- 1) חסימת כתיבות ברשת ----
  var origFetch = window.fetch.bind(window);
  var allowed = function (url) {
    return /\/auth\/v1\//.test(url) || /\/functions\/v1\/ai(\b|\/|\?|$)/.test(url);
  };
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || allowed(url)) return origFetch(input, init);
    blocked++;
    console.warn('[dev] נחסמה כתיבה:', method, url);
    try { window.dispatchEvent(new CustomEvent('dev-write-blocked', { detail: { method: method, url: url } })); } catch (_) {}
    // תשובה מדומה "הצליח": REST מקבל מערך ריק, פונקציות מקבלות הודעה שמסבירה שזו גרסת פיתוח
    var isFn = /\/functions\/v1\//.test(url);
    var body = isFn ? JSON.stringify({ error: BLOCKED_MSG, devBlocked: true }) : '[]';
    return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
  };
  // שליחת beacon (אם יש) — גם היא כתיבה
  if (navigator.sendBeacon) navigator.sendBeacon = function () { blocked++; return true; };

  // ---- 2) הפרדת localStorage מהגרסה הראשית ----
  try {
    var ls = window.localStorage;
    var proto = Object.getPrototypeOf(ls);
    var keep = function (k) { return String(k).indexOf('sb-') === 0; };
    var wrap = function (name, keyArg) {
      var orig = proto[name];
      proto[name] = function () {
        if (this !== ls) return orig.apply(this, arguments);
        var args = Array.prototype.slice.call(arguments);
        if (keyArg && !keep(args[0])) args[0] = 'dev:' + args[0];
        return orig.apply(this, args);
      };
    };
    wrap('getItem', true); wrap('setItem', true); wrap('removeItem', true);
  } catch (_) {}

  // ---- 3) בלי service worker ובלי מנוי להתראות ----
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () { return Promise.reject(new Error('dev: service worker disabled')); };
    }
  } catch (_) {}

  // ---- 4) פס "גרסת פיתוח" ----
  var addBar = function () {
    if (document.getElementById('__devbar')) return;
    // בתוך iframe (למשל אפליקציית העובד המוטמעת במסך העובדים של המשבץ) — הפס כבר מוצג בעמוד העוטף
    try { if (window.top !== window) return; } catch (_) { return; }
    var bar = document.createElement('div');
    bar.id = '__devbar';
    bar.dir = 'rtl';
    bar.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;' +
      'background:#7c3aed;color:#fff;font:700 12px/1 system-ui,Arial,sans-serif;padding:4px 12px;' +
      'border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;white-space:nowrap';
    var render = function () {
      bar.textContent = '🧪 גרסת פיתוח · קריאה בלבד — שום שינוי לא נשמר' + (blocked ? ' · נחסמו ' + blocked + ' כתיבות' : '');
    };
    render();
    window.addEventListener('dev-write-blocked', render);
    document.body.appendChild(bar);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBar); else addBar();
  // סימון בכותרת הלשונית
  var markTitle = function () { if (document.title && document.title.indexOf('🧪') !== 0) document.title = '🧪 ' + document.title; };
  document.addEventListener('DOMContentLoaded', markTitle);
  window.__DEV_READ_ONLY__ = true;
})();
