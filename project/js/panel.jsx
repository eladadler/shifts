// ============ EmployeesSidePanel — חלונית עובדים ============
const PD = window.ShiftData;
const PE = window.ShiftEngine;

function EmployeeCard({ emp, schedule, selectedDate, onDragEmpStart, onDragEnd, editable }) {
  const count = PE.countShifts(schedule, emp.id);
  const req = PD.reqOf(emp.id);
  const overMax = count > emp.max;
  const av = selectedDate ? PD.availabilityOn(emp.id, selectedDate) : null;

  return (
    <div
      className="emp-card"
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'emp', empId: emp.id }));
        e.dataTransfer.effectAllowed = 'copy';
        onDragEmpStart(emp.id);
      }}
      onDragEnd={onDragEnd}
      title={req && req.note ? req.note : emp.name}
    >
      <Avatar emp={emp} size={34} />
      <div className="emp-info">
        <div className="emp-name-row">
          <span className="emp-name">{emp.name}</span>
          {emp.anchor && <span className="anchor-tag" title="עוגן — עובד ותיק">⚓</span>}
        </div>
        <div className="emp-meta">
          <span className="emp-role">{emp.role}</span>
          {av === 'unavailable' && <span className="av-tag av-no">לא יכול</span>}
          {av === 'high' && <span className="av-tag av-high">עדיפות גבוהה</span>}
          {av === 'can' && <span className="av-tag av-can">יכול לעבוד</span>}
        </div>
      </div>
      <div className="emp-side">
        <span className={'emp-count' + (overMax ? ' emp-count-over' : '')} title="משמרות החודש / מכסה">{count} / {emp.max}</span>
        {req && <span className="req-dot" title="הגיש/ה בקשת זמינות לחודש"></span>}
      </div>
    </div>
  );
}

function EmployeesSidePanel({ schedule, selectedDate, draggingEmp, onDragEmpStart, onDragEnd, editable }) {
  const [tab, setTab] = React.useState('all');

  const list = React.useMemo(() => {
    let emps = PD.EMPLOYEES;
    if (tab === 'available') {
      emps = emps.filter((e) => !selectedDate || PD.availabilityOn(e.id, selectedDate) !== 'unavailable');
    } else if (tab === 'requests') {
      emps = emps.filter((e) => PD.reqOf(e.id));
    }
    return emps;
  }, [tab, selectedDate, schedule]);

  return (
    <aside className="side-panel">
      <div className="side-head">
        <h2 className="side-title">עובדים</h2>
        <span className="side-count">{list.length}</span>
      </div>
      <div className="side-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'all'} className={'side-tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>כל העובדים</button>
        <button role="tab" aria-selected={tab === 'available'} className={'side-tab' + (tab === 'available' ? ' on' : '')} onClick={() => setTab('available')}>זמינים ליום</button>
        <button role="tab" aria-selected={tab === 'requests'} className={'side-tab' + (tab === 'requests' ? ' on' : '')} onClick={() => setTab('requests')}>עם בקשות</button>
      </div>
      {tab === 'available' && (
        <div className="side-note">
          {selectedDate ? <span>זמינים ל־<b>{PD.dayLabel(selectedDate)} {PD.shortDate(selectedDate)}</b></span> : 'בחרו יום בלוח לסינון'}
        </div>
      )}
      <div className="emp-list">
        {list.map((emp) => (
          <EmployeeCard key={emp.id} emp={emp} schedule={schedule} selectedDate={tab === 'available' ? selectedDate : selectedDate}
            onDragEmpStart={onDragEmpStart} onDragEnd={onDragEnd} editable={editable} />
        ))}
      </div>
      <div className="side-hint">גררו עובד אל משמרת בלוח · גרירת משמרת קיימת = העברה · עם <kbd>Shift</kbd> = שכפול</div>
    </aside>
  );
}

Object.assign(window, { EmployeesSidePanel, EmployeeCard });
