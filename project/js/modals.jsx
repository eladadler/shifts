// ============ GenerateDraftModal + לוג החלטות AI ============
const MD = window.ShiftData;
const ME = window.ShiftEngine;

function GenerateDraftModal({ open, onClose, onGenerate, initialRange, initialExcluded }) {
  const base = ME.defaultRange(MD.MONTH);
  const [daysBefore, setDaysBefore] = React.useState(0);
  const [daysAfter, setDaysAfter] = React.useState(0);
  const [excluded, setExcluded] = React.useState(initialExcluded || []);

  React.useEffect(() => {
    if (open) {
      const r = initialRange || base;
      setDaysBefore(Math.max(0, Math.round((MD.parseDate(base.start) - MD.parseDate(r.start)) / 864e5)));
      setDaysAfter(Math.max(0, Math.round((MD.parseDate(r.end) - MD.parseDate(base.end)) / 864e5)));
      setExcluded(initialExcluded || []);
    }
  }, [open]);

  if (!open) return null;

  const range = { start: MD.addDays(base.start, -daysBefore), end: MD.addDays(base.end, daysAfter) };
  const dates = ME.listDates(range.start, range.end);
  const toggleExcluded = (d) => setExcluded((xs) => xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]);
  const activeCount = dates.length - excluded.filter((d) => dates.includes(d)).length;

  const stepper = (label, value, setValue, max, hint) => (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="stepper">
        <button className="stepper-btn" onClick={() => setValue(Math.max(0, value - 1))} aria-label="הפחתה">−</button>
        <span className="stepper-val">{value}</span>
        <button className="stepper-btn" onClick={() => setValue(Math.min(max, value + 1))} aria-label="הוספה">+</button>
        <span className="field-hint">{hint}</span>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} data-screen-label="מודל יצירת טיוטה">
        <div className="modal-head">
          <h2 className="modal-title">יצירת טיוטה חדשה</h2>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">×</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">חודש ראשי</label>
            <div className="month-pill">{MD.monthLabel(MD.MONTH)}</div>
          </div>

          <div className="field-row">
            {stepper('ימים מהחודש הקודם', daysBefore, setDaysBefore, 7, daysBefore ? `מ־${MD.shortDate(range.start)}` : '')}
            {stepper('ימים מהחודש הבא', daysAfter, setDaysAfter, 7, daysAfter ? `עד ${MD.shortDate(range.end)}` : '')}
          </div>

          <div className="field">
            <label className="field-label">הוצאת ימים מהסידור <span className="field-sub">לחצו על יום כדי להחריג (חגים, ימי סגירה)</span></label>
            <div className="exclude-grid" dir="rtl">
              {dates.map((d) => (
                <button key={d}
                  className={'exclude-pill' + (excluded.includes(d) ? ' off' : '') + (MD.weekdayOf(d) >= 5 ? ' wknd' : '')}
                  onClick={() => toggleExcluded(d)}
                  title={`${MD.dayLabel(d)} ${MD.shortDate(d)}`}>
                  <span className="exclude-pill-day">{MD.HEB_DAYS_SHORT[MD.weekdayOf(d)]}</span>
                  <span className="exclude-pill-num">{MD.parseDate(d).getDate()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <span className="modal-summary">{activeCount} ימים בסידור · {excluded.length} מוחרגים</span>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>ביטול</button>
            <button className="btn btn-primary" onClick={() => onGenerate({ startDate: range.start, endDate: range.end, excluded })}>
              ✦ צור סידור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LOG_META = {
  info: { label: 'מידע', cls: 'log-info' },
  dilemma: { label: 'דילמה', cls: 'log-dilemma' },
  decision: { label: 'הכרעה', cls: 'log-decision' },
};

function LogDrawer({ open, log, onClose }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} data-screen-label="לוג החלטות AI">
        <div className="drawer-head">
          <h2 className="drawer-title">לוג החלטות השיבוץ</h2>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה">×</button>
        </div>
        {(!log || !log.length) ? (
          <div className="drawer-empty">עדיין לא הורץ שיבוץ אוטומטי.</div>
        ) : (
          <ol className="log-list">
            {log.map((entry, i) => {
              const meta = LOG_META[entry.type] || LOG_META.info;
              return (
                <li key={i} className={'log-row ' + meta.cls}>
                  <span className="log-type">{meta.label}</span>
                  <span className="log-msg">{entry.message}</span>
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}

Object.assign(window, { GenerateDraftModal, LogDrawer });
