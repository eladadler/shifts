/**
 * calendar — מגיש את המשמרות של עובד יחיד כמנוי יומן (ICS).
 * הכתובת נפתחת ללא אימות כי יומן גוגל מושך אותה בלי שום כותרת הרשאה,
 * ולכן הזיהוי נעשה דרך אסימון אקראי שנשמר ב-app_employees.cal_token.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MONTHS_BACK = 1
const MONTHS_AHEAD = 6

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token') || ''
  if (token.length < 16) return new Response('Bad token', { status: 400 })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: emp } = await sb.from('app_employees')
    .select('id,name').eq('cal_token', token).maybeSingle()
  if (!emp) return new Response('Not found', { status: 404 })

  const months: string[] = []
  const now = new Date()
  for (let i = -MONTHS_BACK; i <= MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }

  const [{ data: rows }, { data: emps }] = await Promise.all([
    sb.from('published_schedules').select('month,schedule,shift_settings').in('month', months),
    sb.from('app_employees').select('id,name'),
  ])
  const names: Record<string, string> = {}
  for (const e of (emps || [])) names[e.id] = e.name

  const events: string[] = []
  for (const row of (rows || [])) {
    const ss = row.shift_settings || null
    const schedule: Record<string, Record<string, string[]>> = row.schedule || {}
    for (const [dateStr, shifts] of Object.entries(schedule)) {
      for (const [shiftId, empIds] of Object.entries(shifts || {})) {
        if (!(empIds as string[]).includes(emp.id)) continue
        const def = shiftDefOf(shiftId, dateStr, ss)
        if (!def) continue
        const t = personTimes(dateStr, def, emp.id)
        const mates = (empIds as string[]).filter(i => i !== emp.id).map(i => names[i] || i)
        events.push(vevent({
          uid: `${dateStr}-${shiftId}-${emp.id}@mishmarot`,
          start: t.start, end: t.end,
          summary: def.name || shiftId,
          description: mates.length ? 'יחד עם: ' + mates.join(', ') : 'משמרת יחיד',
        }))
      }
    }
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mishmarot//shifts//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold('X-WR-CALNAME:המשמרות שלי'),
    'X-WR-TIMEZONE:Asia/Jerusalem',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

// ---- ICS helpers ----
// שעות המשמרת הן שעון מקומי בישראל. הריצה כאן ב-UTC, ולכן בניית Date
// והוצאת השעה ממנו מחזירות בדיוק את אותן ספרות — ומסומנות כאן כ-TZID.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Asia/Jerusalem',
  'BEGIN:STANDARD',
  'DTSTART:19701025T020000',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZNAME:IST',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700327T020000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR',
  'TZNAME:IDT',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
].join('\r\n')

function pad2(n: number) { return String(n).padStart(2, '0') }
function local(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
}
function esc(s: string) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
// שורה ב-ICS מוגבלת ל-75 בתים, והקיפול נספר בבתים בגלל העברית
function fold(line: string) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 73) return line
  const out: string[] = []
  let cur = ''
  let len = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (len + n > 73) { out.push(cur); cur = ' '; len = 1 }
    cur += ch; len += n
  }
  out.push(cur)
  return out.join('\r\n')
}
function vevent(e: { uid: string; start: Date; end: Date; summary: string; description: string }) {
  return [
    'BEGIN:VEVENT',
    fold('UID:' + e.uid),
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    'DTSTART;TZID=Asia/Jerusalem:' + local(e.start),
    'DTEND;TZID=Asia/Jerusalem:' + local(e.end),
    fold('SUMMARY:' + esc(e.summary)),
    fold('DESCRIPTION:' + esc(e.description)),
    'END:VEVENT',
  ].join('\r\n')
}

// ---- shift resolution (mirrors shiftTypesFor in the manager app) ----
const WEEKDAY_SHIFTS = [{ id: 'morning', start: '09:00', end: '21:00' }, { id: 'evening', start: '09:00', end: '20:00' }, { id: 'night', start: '21:00', end: '09:00' }]
const WEEKEND_SHIFTS = [{ id: 'morning', start: '09:00', end: '21:00' }, { id: 'short', start: '15:00', end: '19:00' }, { id: 'night', start: '21:00', end: '09:00' }]

const dateStrOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
function addDaysStr(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n)
  return dateStrOf(dt)
}
function atTime(s: string, hm: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  const [h, mi] = String(hm).split(':').map(Number)
  return new Date(y, m - 1, d, h, mi, 0, 0)
}
function getBase(dateStr: string, ss: any) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  if (ss) {
    if (wd === 6) return ss.saturday || ss.weekend || WEEKEND_SHIFTS
    if (wd === 5) return ss.friday || ss.weekend || WEEKEND_SHIFTS
    return ss.weekday || WEEKDAY_SHIFTS
  }
  return (wd === 5 || wd === 6) ? WEEKEND_SHIFTS : WEEKDAY_SHIFTS
}
function shiftDefOf(shiftId: string, dateStr: string, ss: any): any {
  const special: any[] = (ss && ss.special) || []
  let def = special.find(sp => sp.date === dateStr && sp.id === shiftId)
  if (!def) {
    for (const sp of special) {
      const span = sp.daysSpan || 1
      for (let i = 1; i < span; i++) {
        if (addDaysStr(sp.date, i) === dateStr && sp.id === shiftId) def = { ...sp, continuation: true, originDate: sp.date }
      }
    }
  }
  if (!def) def = (getBase(dateStr, ss) || []).find((s: any) => s.id === shiftId)
  if (!def) return null
  const day = ss && ss._overrides && ss._overrides[def.continuation ? def.originDate : dateStr]
  const o = day && day[shiftId]
  if (!o) return def
  return { ...def, start: o.start || def.start, end: o.end || def.end,
    _startDayOffset: o.startDayOffset || 0, _per: o.per || null }
}
function shiftTimes(dateStr: string, def: any): { start: Date; end: Date } {
  const base = def._startDayOffset ? addDaysStr(dateStr, def._startDayOffset) : dateStr
  const start = atTime(base, def.start || '09:00')
  const lastDay = addDaysStr(base, Math.max(1, def.daysSpan || 1) - 1)
  let end = atTime(lastDay, def.end || def.start || '09:00')
  if (end <= start) end = atTime(addDaysStr(lastDay, 1), def.end || def.start || '09:00')
  return { start, end }
}
function personTimes(dateStr: string, def: any, empId: string): { start: Date; end: Date } {
  const block = shiftTimes(dateStr, def)
  const p = def._per && def._per[empId]
  if (!p || (!p.start && !p.end)) return block
  let start = block.start
  if (p.start) {
    const DAY = 864e5
    const cand = atTime(dateStrOf(block.start), p.start).getTime()
    let best = cand
    for (const c of [cand - DAY, cand + DAY]) {
      if (Math.abs(c - block.start.getTime()) < Math.abs(best - block.start.getTime())) best = c
    }
    start = new Date(best)
  }
  let end = block.end
  if (p.end) {
    const sd = dateStrOf(start)
    end = atTime(sd, p.end)
    if (end <= start) end = atTime(addDaysStr(sd, 1), p.end)
  }
  if (end <= start) end = new Date(start.getTime() + 36e5)
  return { start, end }
}
