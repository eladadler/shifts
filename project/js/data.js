// ============ נתוני דמו — מוקד שירות 24/7, יולי 2026 ============
(function () {
  const MONTH = '2026-07';

  const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const HEB_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const pad = (n) => String(n).padStart(2, '0');
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); };
  const weekdayOf = (s) => parseDate(s).getDay(); // 0=ראשון
  const dayLabel = (s) => HEB_DAYS[weekdayOf(s)];
  const shortDate = (s) => { const d = parseDate(s); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${HEB_MONTHS[m - 1]} ${y}`; };

  // ---- סוגי משמרות לפי יום בשבוע ----
  const WEEKDAY_SHIFTS = [
    { id: 'morning', name: 'בוקר', start: '07:00', end: '15:00' },
    { id: 'evening', name: 'ערב', start: '15:00', end: '23:00' },
    { id: 'night', name: 'לילה', start: '23:00', end: '07:00' },
  ];
  const WEEKEND_SHIFTS = [
    { id: 'morning', name: 'בוקר', start: '07:00', end: '15:00' },
    { id: 'short', name: 'קצר', start: '15:00', end: '19:00' },
    { id: 'night', name: 'לילה', start: '19:00', end: '07:00' },
  ];
  const shiftTypesFor = (s) => {
    const wd = weekdayOf(s);
    return (wd === 5 || wd === 6) ? WEEKEND_SHIFTS : WEEKDAY_SHIFTS;
  };
  const shiftDef = (s, shiftId) => shiftTypesFor(s).find((x) => x.id === shiftId);

  // משמרת -> [start Date, end Date] (לילה נגמרת למחרת)
  const shiftTimes = (s, shift) => {
    const mk = (dStr, hm) => { const d = parseDate(dStr); const [h, m] = hm.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
    const start = mk(s, shift.start);
    let end = mk(s, shift.end);
    if (end <= start) end = mk(addDays(s, 1), shift.end);
    return { start, end };
  };

  // ---- עובדים ----
  // color: גוון ייחודי לאווטאר; nights: האם משובץ למשמרות לילה; anchor: עוגן (ותיק)
  const EMPLOYEES = [
    { id: 'yossi', name: 'יוסי כהן', role: 'אחמ״ש', color: 'oklch(0.62 0.14 250)', max: 20, anchor: true, nights: true },
    { id: 'dana', name: 'דנה לוי', role: 'אחמ״שית', color: 'oklch(0.62 0.14 330)', max: 20, anchor: true, nights: false },
    { id: 'danny', name: 'דני אברהם', role: 'מוקדן בכיר', color: 'oklch(0.62 0.14 160)', max: 18, anchor: true, nights: true },
    { id: 'noa', name: 'נועה פרץ', role: 'מוקדנית', color: 'oklch(0.62 0.14 50)', max: 16, anchor: false, nights: false },
    { id: 'avi', name: 'אבי מזרחי', role: 'מוקדן', color: 'oklch(0.62 0.14 210)', max: 16, anchor: false, nights: true },
    { id: 'michal', name: 'מיכל ברק', role: 'מוקדנית', color: 'oklch(0.62 0.14 10)', max: 14, anchor: false, nights: false },
    { id: 'omer', name: 'עומר שלו', role: 'מוקדן', color: 'oklch(0.62 0.14 130)', max: 16, anchor: false, nights: true },
    { id: 'tamar', name: 'תמר גולן', role: 'מוקדנית בכירה', color: 'oklch(0.62 0.14 290)', max: 18, anchor: false, nights: false },
    { id: 'itay', name: 'איתי רוזן', role: 'מוקדן', color: 'oklch(0.62 0.14 80)', max: 12, anchor: false, nights: true },
    { id: 'shira', name: 'שירה אדלר', role: 'מוקדנית', color: 'oklch(0.62 0.14 350)', max: 14, anchor: false, nights: false },
    { id: 'roni', name: 'רוני חדד', role: 'מוקדן', color: 'oklch(0.62 0.14 190)', max: 16, anchor: false, nights: true },
    { id: 'lior', name: 'ליאור נחום', role: 'מוקדן', color: 'oklch(0.62 0.14 110)', max: 14, anchor: false, nights: false },
    { id: 'hila', name: 'הילה שמש', role: 'מוקדנית', color: 'oklch(0.62 0.14 30)', max: 12, anchor: false, nights: false },
    { id: 'alon', name: 'אלון דור', role: 'מוקדן לילה', color: 'oklch(0.62 0.14 270)', max: 16, anchor: false, nights: true, nightOwl: true },
  ];

  // ---- בקשות זמינות לחודש (employee portal) ----
  // unavailable = "לא יכול" / can = "יכול לעבוד" / high = "בעדיפות גבוהה"
  const REQUESTS = {
    noa: { unavailable: ['2026-07-06', '2026-07-07', '2026-07-08'], high: ['2026-07-12', '2026-07-19'], can: ['2026-07-26'], note: 'בחופשה 6–8 ביולי. מעדיפה בקרים בתחילת שבוע.' },
    avi: { unavailable: ['2026-07-10', '2026-07-24'], high: ['2026-07-15'], can: ['2026-07-17', '2026-07-31'], note: 'לא זמין בימי שישי 10 ו־24 — אירועים משפחתיים.' },
    michal: { unavailable: ['2026-07-02', '2026-07-16', '2026-07-30'], can: ['2026-07-05', '2026-07-12'], high: [], note: 'לימודים בימי חמישי לסירוגין.' },
    tamar: { unavailable: ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'], high: ['2026-07-05', '2026-07-27'], can: [], note: 'מילואים 20–23 ביולי.' },
    itay: { unavailable: ['2026-07-03', '2026-07-04'], can: ['2026-07-08', '2026-07-22'], high: ['2026-07-29'], note: '' },
    roni: { unavailable: ['2026-07-13'], high: ['2026-07-10', '2026-07-11'], can: ['2026-07-18'], note: 'מעדיף סופי שבוע — תוספת מבורכת.' },
    hila: { unavailable: ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12'], can: ['2026-07-19', '2026-07-26'], high: [], note: 'נסיעה לחו״ל 9–12 ביולי.' },
    alon: { unavailable: [], high: ['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22', '2026-07-29'], can: [], note: 'מעדיף לילות בלבד, כמה שיותר.' },
  };

  const reqOf = (empId) => REQUESTS[empId] || null;
  const availabilityOn = (empId, dStr) => {
    const r = REQUESTS[empId];
    if (!r) return null;
    if (r.unavailable.includes(dStr)) return 'unavailable';
    if (r.high.includes(dStr)) return 'high';
    if (r.can.includes(dStr)) return 'can';
    return null;
  };

  const empById = (id) => EMPLOYEES.find((e) => e.id === id);
  const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');

  window.ShiftData = {
    MONTH, HEB_DAYS, HEB_DAYS_SHORT, EMPLOYEES, REQUESTS,
    pad, parseDate, dateStr, addDays, weekdayOf, dayLabel, shortDate, monthLabel,
    shiftTypesFor, shiftDef, shiftTimes, reqOf, availabilityOn, empById, initials,
  };
})();
