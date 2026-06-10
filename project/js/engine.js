// ============ מנוע שיבוץ + זיהוי קונפליקטים + ייצוא ============
(function () {
  const D = window.ShiftData;
  const MIN_REST_H = 8;

  const listDates = (startStr, endStr) => {
    const out = [];
    let cur = startStr;
    while (cur <= endStr) { out.push(cur); cur = D.addDays(cur, 1); }
    return out;
  };

  const defaultRange = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { start: `${ym}-01`, end: `${ym}-${D.pad(last)}` };
  };

  // יציב-דטרמיניסטי: hash קטן לשבירת שוויון
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h / 997; };

  const gapHours = (prevEnd, nextStart) => (nextStart - prevEnd) / 36e5;

  // ---- יצירת סידור אוטומטי ----
  function generate({ startDate, endDate, excluded = [] }) {
    const dates = listDates(startDate, endDate).filter((d) => !excluded.includes(d));
    const schedule = {};
    const log = [];
    const counts = {}; const lastEnd = {};
    D.EMPLOYEES.forEach((e) => { counts[e.id] = 0; lastEnd[e.id] = null; });
    const now = () => new Date().toISOString();
    const addLog = (type, message) => log.push({ timestamp: now(), type, message });

    addLog('info', `התחלת שיבוץ אוטומטי: ${D.shortDate(startDate)}–${D.shortDate(endDate)}, ${dates.length} ימים`);
    excluded.forEach((d) => addLog('info', `יום ${D.shortDate(d)} הוחרג מהסידור`));

    dates.forEach((dStr) => {
      schedule[dStr] = schedule[dStr] || {};
      D.shiftTypesFor(dStr).forEach((shift) => {
        const t = D.shiftTimes(dStr, shift);
        // מועמדים: לא "לא יכול", לא מעל מכסה, מתאים ללילה אם רלוונטי
        const cands = D.EMPLOYEES.filter((e) => {
          if (D.availabilityOn(e.id, dStr) === 'unavailable') return false;
          if (counts[e.id] >= e.max) return false;
          if (shift.id === 'night' && !e.nights) return false;
          return true;
        });
        const clean = cands.filter((e) => !lastEnd[e.id] || gapHours(lastEnd[e.id], t.start) >= MIN_REST_H);
        const pool = clean.length ? clean : cands;

        if (!pool.length) {
          schedule[dStr][shift.id] = [];
          addLog('dilemma', `אין עובד זמין למשמרת ${shift.name} ב־${D.shortDate(dStr)}`);
          return;
        }

        const score = (e) => {
          const av = D.availabilityOn(e.id, dStr);
          let s = 0;
          if (av === 'high') s += 6;
          if (av === 'can') s += 2;
          if (e.anchor) s += 3;
          if (e.nightOwl && shift.id === 'night') s += 5;
          s -= counts[e.id] * 0.9; // איזון עומסים
          s += hash(e.id + dStr + shift.id) * 0.5;
          return s;
        };
        const best = pool.slice().sort((a, b) => score(b) - score(a))[0];
        const restViolation = !clean.includes(best);

        schedule[dStr][shift.id] = [best.id];
        counts[best.id] += 1;
        lastEnd[best.id] = t.end;

        const av = D.availabilityOn(best.id, dStr);
        if (restViolation) addLog('decision', `שובץ ${best.name} ל${shift.name} ב־${D.shortDate(dStr)} בחריגת מנוחה — אין חלופה`);
        else if (av === 'high') addLog('info', `שובץ ${best.name} ל${shift.name} ב־${D.shortDate(dStr)} לפי בקשה בעדיפות גבוהה`);
        else if (best.anchor && D.parseDate(dStr).getDate() <= 2) addLog('info', `${best.name} (עוגן) שובץ ראשון ל${shift.name} ב־${D.shortDate(dStr)}`);
      });
    });

    const total = Object.values(schedule).reduce((n, day) => n + Object.values(day).filter((a) => a.length).length, 0);
    addLog('info', `השיבוץ הושלם: ${total} משמרות אוישו`);
    return { schedule, log };
  }

  // ---- זיהוי קונפליקטים על סידור נתון ----
  // מחזיר Map: `${date}|${shiftId}|${empId}` -> [הסברים]
  function detectConflicts(schedule) {
    const issues = {};
    const add = (d, sh, emp, msg) => {
      const k = `${d}|${sh}|${emp}`;
      (issues[k] = issues[k] || []).push(msg);
    };

    // כל השיבוצים, ממוינים בזמן, לכל עובד
    const byEmp = {};
    Object.keys(schedule).sort().forEach((dStr) => {
      Object.entries(schedule[dStr]).forEach(([shiftId, emps]) => {
        const shift = D.shiftDef(dStr, shiftId);
        if (!shift) return;
        const t = D.shiftTimes(dStr, shift);
        emps.forEach((empId) => {
          (byEmp[empId] = byEmp[empId] || []).push({ dStr, shiftId, shift, ...t });
          if (D.availabilityOn(empId, dStr) === 'unavailable') {
            add(dStr, shiftId, empId, 'שובץ ביום שסומן ״לא יכול״');
          }
        });
      });
    });

    Object.entries(byEmp).forEach(([empId, list]) => {
      list.sort((a, b) => a.start - b.start);
      const emp = D.empById(empId);
      // מנוחה / חפיפה
      for (let i = 1; i < list.length; i++) {
        const g = gapHours(list[i - 1].end, list[i].start);
        if (g < 0) add(list[i].dStr, list[i].shiftId, empId, 'חפיפת שעות עם משמרת אחרת');
        else if (g < MIN_REST_H) add(list[i].dStr, list[i].shiftId, empId, `מנוחה של ${Math.round(g)} ש׳ בלבד מהמשמרת הקודמת (מינ׳ ${MIN_REST_H})`);
      }
      // מכסה חודשית
      if (emp && list.length > emp.max) {
        list.slice(emp.max).forEach((a) => add(a.dStr, a.shiftId, empId, `חריגה ממכסה חודשית (${emp.max} משמרות)`));
      }
    });
    return issues;
  }

  const countShifts = (schedule, empId) => {
    let n = 0;
    Object.values(schedule).forEach((day) => Object.values(day).forEach((emps) => { if (emps.includes(empId)) n++; }));
    return n;
  };

  // ---- ייצוא CSV (נפתח באקסל, עברית עם BOM) ----
  function exportCsv(schedule, conflicts) {
    const rows = [['תאריך', 'יום בשבוע', 'סוג משמרת', 'שם עובד', 'שעת התחלה', 'שעת סיום', 'חריגות']];
    Object.keys(schedule).sort().forEach((dStr) => {
      D.shiftTypesFor(dStr).forEach((shift) => {
        const emps = schedule[dStr][shift.id] || [];
        if (!emps.length) {
          rows.push([dStr, D.dayLabel(dStr), shift.name, '— לא מאויש —', shift.start, shift.end, '']);
        } else {
          emps.forEach((empId) => {
            const emp = D.empById(empId);
            const c = (conflicts[`${dStr}|${shift.id}|${empId}`] || []).join('; ');
            rows.push([dStr, D.dayLabel(dStr), shift.name, emp ? emp.name : empId, shift.start, shift.end, c]);
          });
        }
      });
    });
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `סידור-עבודה-${D.MONTH}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  window.ShiftEngine = { listDates, defaultRange, generate, detectConflicts, countShifts, exportCsv, MIN_REST_H, gapHours };
})();
