// ============ App — מעטפת ראשית ============
const AD = window.ShiftData;
const AE = window.ShiftEngine;

const STORAGE_KEY = 'mishmarot-state-v2';

const STATUS_META = {
  preview: { label: 'טרם נוצרה טיוטה', cls: 'st-preview' },
  generating: { label: 'ה־AI משבץ…', cls: 'st-generating' },
  draft: { label: 'טיוטה', cls: 'st-draft' },
  final: { label: 'סידור סופי', cls: 'st-final' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3D63C9",
  "density": "רגילה",
  "dark": false
}/*EDITMODE-END*/;

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && s.status) return s;
  } catch (e) { }
  return null;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const saved = React.useMemo(loadState, []);
  const [status, setStatus] = React.useState(saved ? saved.status : 'preview');
  const [range, setRange] = React.useState(saved && saved.range ? saved.range : AE.defaultRange(AD.MONTH));
  const [excluded, setExcluded] = React.useState(saved ? saved.excluded || [] : []);
  const [schedule, setSchedule] = React.useState(saved ? saved.schedule || {} : {});
  const [log, setLog] = React.useState(saved ? saved.log || [] : []);
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [draggingEmp, setDraggingEmp] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);

  // התמדה
  React.useEffect(() => {
    if (status === 'generating') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, range, excluded, schedule, log }));
  }, [status, range, excluded, schedule, log]);

  // ערכת נושא + צפיפות + צבע
  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = t.dark ? 'dark' : 'light';
    root.dataset.density = t.density === 'קומפקטית' ? 'compact' : 'regular';
    root.style.setProperty('--accent', t.accent);
  }, [t.dark, t.density, t.accent]);

  const conflicts = React.useMemo(() => AE.detectConflicts(schedule), [schedule]);
  const conflictCount = Object.keys(conflicts).length;
  const dilemmaCount = log.filter((l) => l.type !== 'info').length;
  const editable = status === 'draft';

  // ---- פעולות ----
  const assign = (dStr, shiftId, empId) => {
    setSchedule((s) => {
      const day = { ...(s[dStr] || {}) };
      const cur = day[shiftId] || [];
      if (cur.includes(empId)) return s;
      day[shiftId] = [...cur, empId];
      return { ...s, [dStr]: day };
    });
  };

  const remove = (dStr, shiftId, empId) => {
    setSchedule((s) => {
      const day = { ...(s[dStr] || {}) };
      day[shiftId] = (day[shiftId] || []).filter((id) => id !== empId);
      return { ...s, [dStr]: day };
    });
  };

  const moveChip = (from, to, empId, copy) => {
    if (from.dStr === to.dStr && from.shiftId === to.shiftId) return;
    setSchedule((s) => {
      const next = { ...s };
      if (!copy) {
        const fromDay = { ...(next[from.dStr] || {}) };
        fromDay[from.shiftId] = (fromDay[from.shiftId] || []).filter((id) => id !== empId);
        next[from.dStr] = fromDay;
      }
      const toDay = { ...(next[to.dStr] || {}) };
      const cur = toDay[to.shiftId] || [];
      if (!cur.includes(empId)) toDay[to.shiftId] = [...cur, empId];
      next[to.dStr] = toDay;
      return next;
    });
  };

  const generate = (opts) => {
    setModalOpen(false);
    setRange({ start: opts.startDate, end: opts.endDate });
    setExcluded(opts.excluded);
    setStatus('generating');
    setTimeout(() => {
      const res = AE.generate(opts);
      setSchedule(res.schedule);
      setLog(res.log);
      setStatus('draft');
    }, 1600);
  };

  const slotProps = {
    onAssign: assign,
    onRemove: remove,
    onMoveChip: moveChip,
    onDragChipStart: setDraggingEmp,
    onDragEnd: () => setDraggingEmp(null),
  };

  const st = STATUS_META[status];

  return (
    <div className="app" dir="rtl">
      <header className="topbar" data-screen-label="סרגל עליון">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">⧉</span>
          <span className="brand-name">משמרות</span>
        </div>
        <div className="topbar-center">
          <h1 className="month-title">{AD.monthLabel(AD.MONTH)}</h1>
          <span className={'status-chip ' + st.cls}>{st.label}</span>
          {conflictCount > 0 && status !== 'preview' && (
            <span className="conflict-count" title="שיבוצים עם חריגה מכלל">{conflictCount} קונפליקטים</span>
          )}
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={() => setLogOpen(true)} disabled={status === 'preview'}>
            לוג AI{dilemmaCount > 0 && <span className="btn-badge">{dilemmaCount}</span>}
          </button>
          <button className="btn" onClick={() => AE.exportCsv(schedule, conflicts)} disabled={status === 'preview' || status === 'generating'}>
            ייצוא לאקסל
          </button>
          {status === 'draft' && (
            <button className="btn btn-final" onClick={() => setStatus('final')}>אישור ופרסום</button>
          )}
          {status === 'final' && (
            <button className="btn" onClick={() => setStatus('draft')}>חזרה לעריכה</button>
          )}
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} disabled={status === 'generating'}>
            ✦ צור טיוטה חדשה
          </button>
        </div>
      </header>

      {status === 'final' && (
        <div className="final-banner">הסידור פורסם לעובדים והוא נעול לעריכה. לחצו ״חזרה לעריכה״ כדי לבצע שינויים.</div>
      )}

      <main className="layout">
        <section className="board" data-screen-label="לוח חודשי">
          {status === 'preview' ? (
            <div className="empty-state">
              <div className="empty-card">
                <div className="empty-mark" aria-hidden="true">⧉</div>
                <h2 className="empty-title">אין עדיין סידור ל{AD.monthLabel(AD.MONTH)}</h2>
                <p className="empty-sub">צרו טיוטה חדשה וה־AI ישבץ את העובדים לפי בקשות, מכסות וזמני מנוחה. לאחר מכן תוכלו לדייק את התוצאה בגרירה.</p>
                <button className="btn btn-primary btn-lg" onClick={() => setModalOpen(true)}>✦ צור טיוטה חדשה</button>
              </div>
            </div>
          ) : (
            <div className="board-inner">
              <MonthView range={range} excluded={excluded} schedule={schedule} conflicts={conflicts}
                editable={editable} draggingEmp={draggingEmp} selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate((cur) => cur === d ? null : d)} slotProps={slotProps} />
              {status === 'generating' && (
                <div className="generating-overlay">
                  <div className="generating-card">
                    <span className="spinner" aria-hidden="true"></span>
                    <div>
                      <div className="generating-title">ה־AI מרכיב את הסידור…</div>
                      <div className="generating-sub">עוגנים ← זמינות ← מכסות ← זמני מנוחה ← העדפות</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <EmployeesSidePanel schedule={schedule} selectedDate={selectedDate} draggingEmp={draggingEmp}
          onDragEmpStart={setDraggingEmp} onDragEnd={() => setDraggingEmp(null)} editable={editable} />
      </main>

      <GenerateDraftModal open={modalOpen} onClose={() => setModalOpen(false)} onGenerate={generate}
        initialRange={range} initialExcluded={excluded} />
      <LogDrawer open={logOpen} log={log} onClose={() => setLogOpen(false)} />

      <TweaksPanel>
        <TweakSection label="צבע" />
        <TweakColor label="צבע ראשי" value={t.accent} options={['#3D63C9', '#1F8A5B', '#7A5AE0', '#B5512E']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="תצוגה" />
        <TweakRadio label="צפיפות הלוח" value={t.density} options={['רגילה', 'קומפקטית']}
          onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="מצב כהה" value={t.dark} onChange={(v) => setTweak('dark', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
