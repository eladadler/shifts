// ============ MonthView — לוח חודשי עם Drag & Drop ============
const D = window.ShiftData;
const E = window.ShiftEngine;

function Avatar({ emp, size = 22 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: emp.color }} title={emp.name}>
      {D.initials(emp.name)}
    </span>
  );
}

function ShiftChip({ emp, dStr, shiftId, conflicts, editable, onRemove, onDragChipStart, onDragEnd }) {
  const key = `${dStr}|${shiftId}|${emp.id}`;
  const issues = conflicts[key] || [];
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'chip', empId: emp.id, from: { dStr, shiftId } }));
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragChipStart(emp.id);
  };
  return (
    <div
      className={'chip' + (issues.length ? ' chip-conflict' : '')}
      draggable={editable}
      onDragStart={editable ? handleDragStart : undefined}
      onDragEnd={onDragEnd}
      title={issues.length ? issues.join('\n') : emp.name}
    >
      <Avatar emp={emp} size={20} />
      <span className="chip-name">{emp.name}</span>
      {issues.length > 0 && <span className="conflict-badge" title={issues.join('\n')}>!</span>}
      {editable && (
        <button className="chip-x" title="הסרה מהמשמרת" onClick={(e) => { e.stopPropagation(); onRemove(dStr, shiftId, emp.id); }}>×</button>
      )}
    </div>
  );
}

function ShiftSlot({ dStr, shift, emps, conflicts, editable, draggingEmp, onAssign, onRemove, onMoveChip, onDragChipStart, onDragEnd }) {
  const [over, setOver] = React.useState(false);
  const hasConflict = emps.some((id) => (conflicts[`${dStr}|${shift.id}|${id}`] || []).length);
  const stateCls = hasConflict ? 'slot-conflict' : (emps.length ? 'slot-ok' : 'slot-empty');

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setOver(false);
    if (!editable) return;
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (!payload) return;
    if (payload.kind === 'emp') onAssign(dStr, shift.id, payload.empId);
    else if (payload.kind === 'chip') onMoveChip(payload.from, { dStr, shiftId: shift.id }, payload.empId, e.shiftKey);
  };

  return (
    <div
      className={`slot ${stateCls}` + (over && editable ? ' slot-over' : '')}
      onDragOver={(e) => { if (editable) { e.preventDefault(); e.dataTransfer.dropEffect = e.shiftKey ? 'copy' : 'move'; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <div className="slot-head">
        <span className="slot-dot" aria-hidden="true"></span>
        <span className="slot-name">{shift.name}</span>
        <span className="slot-hours">{shift.start}–{shift.end}</span>
      </div>
      {emps.length === 0 ? (
        <div className="slot-placeholder">{editable ? 'גררו עובד לכאן' : 'לא מאויש'}</div>
      ) : (
        <div className="slot-chips">
          {emps.map((id) => {
            const emp = D.empById(id);
            return emp && (
              <ShiftChip key={id} emp={emp} dStr={dStr} shiftId={shift.id} conflicts={conflicts}
                editable={editable} onRemove={onRemove} onDragChipStart={onDragChipStart} onDragEnd={onDragEnd} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayCard({ dStr, inMonth, excluded, schedule, conflicts, editable, draggingEmp, selected, onSelect, slotProps }) {
  const wd = D.weekdayOf(dStr);
  const isWeekend = wd === 5 || wd === 6;
  const day = schedule[dStr] || {};

  // הארה/עמעום לפי זמינות העובד הנגרר
  let availCls = '';
  if (draggingEmp) {
    const av = D.availabilityOn(draggingEmp, dStr);
    if (av === 'unavailable') availCls = ' day-dim';
    else if (av === 'high') availCls = ' day-glow';
  }

  if (excluded) {
    return (
      <div className={'day day-excluded' + (isWeekend ? ' day-weekend' : '')}>
        <div className="day-head">
          <span className="day-num">{D.parseDate(dStr).getDate()}</span>
          <span className="day-name">{D.dayLabel(dStr)}</span>
        </div>
        <div className="excluded-label">מוחרג מהסידור</div>
      </div>
    );
  }

  return (
    <div
      className={'day' + (isWeekend ? ' day-weekend' : '') + (selected ? ' day-selected' : '') + availCls}
      onClick={() => onSelect(dStr)}
      data-screen-label={`יום ${D.shortDate(dStr)}`}
    >
      <div className="day-head">
        <span className="day-num">{D.parseDate(dStr).getDate()}</span>
        <span className="day-name">{D.dayLabel(dStr)}</span>
      </div>
      <div className="day-slots">
        {D.shiftTypesFor(dStr).map((shift) => (
          <ShiftSlot key={shift.id} dStr={dStr} shift={shift} emps={day[shift.id] || []}
            conflicts={conflicts} editable={editable} draggingEmp={draggingEmp} {...slotProps} />
        ))}
      </div>
    </div>
  );
}

function MonthView({ range, excluded, schedule, conflicts, editable, draggingEmp, selectedDate, onSelectDate, slotProps }) {
  // בניית רשת שבועות מלאה: מיום ראשון שלפני תחילת הטווח עד שבת שאחרי סופו
  const cells = React.useMemo(() => {
    let cur = range.start;
    while (D.weekdayOf(cur) !== 0) cur = D.addDays(cur, -1);
    let end = range.end;
    while (D.weekdayOf(end) !== 6) end = D.addDays(end, 1);
    return E.listDates(cur, end).map((dStr) => ({ dStr, inRange: dStr >= range.start && dStr <= range.end }));
  }, [range.start, range.end]);

  return (
    <div className="month-wrap">
      <div className="month-header-row">
        {D.HEB_DAYS.map((d) => <div key={d} className="month-header-cell">{d}</div>)}
      </div>
      <div className="month-grid">
        {cells.map(({ dStr, inRange }) =>
          inRange ? (
            <DayCard key={dStr} dStr={dStr} inMonth excluded={excluded.includes(dStr)}
              schedule={schedule} conflicts={conflicts} editable={editable} draggingEmp={draggingEmp}
              selected={selectedDate === dStr} onSelect={onSelectDate} slotProps={slotProps} />
          ) : (
            <div key={dStr} className="day day-out">
              <div className="day-head"><span className="day-num day-num-out">{D.parseDate(dStr).getDate()}</span></div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Avatar, ShiftChip, ShiftSlot, DayCard, MonthView });
