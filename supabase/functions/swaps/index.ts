/**
 * swaps — יוזם, מאשר ומיישם בקשות חילוף משמרות בין עובדים.
 * שלוש פעולות שכותבות: create, respond, claim, cancel (POST { action, ... }).
 * יישום בפועל (kind='full'|'partial'|'hole') כותב לשני מקומות בו-זמנית:
 * published_schedules (מה שהעובדים רואים עכשיו) ו-mishmarot_state.data
 * (המקור שממנו המשבץ מפרסם מחדש) — בלי זה פרסום עתידי היה מבטל כל חילוף.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  try {
    const body = await req.json()
    switch (body.action) {
      case 'create': return json(await create(sb, body))
      case 'respond': return json(await respond(sb, body))
      case 'claim': return json(await claim(sb, body))
      case 'cancel': return json(await cancel(sb, body))
      default: return json({ error: 'unknown action' }, 400)
    }
  } catch (e: any) {
    console.error('swaps error:', e)
    return json({ error: e.message || String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

// ---- settings ----
async function getSwapSettings(sb: any) {
  const { data } = await sb.from('mishmarot_state').select('data').eq('id', 'main').maybeSingle()
  return {
    peerApprovalFull: !!data?.data?.swapSettings?.peerApprovalFull,
    peerApprovalPartial: !!data?.data?.swapSettings?.peerApprovalPartial,
    managerApprovalFull: !!data?.data?.swapSettings?.managerApprovalFull,
    managerApprovalPartial: !!data?.data?.swapSettings?.managerApprovalPartial,
  }
}

function namesOf(state: any) { return (state?.employees || []).reduce((m: any, e: any) => (m[e.id] = e.name, m), {}) }

// ---- create ----
async function create(sb: any, b: any) {
  const kind = b.kind as 'full' | 'partial' | 'hole'
  const source = (b.source || 'direct') as 'direct' | 'market'
  const row: any = {
    month: b.month, kind, source, date: b.date, shift_id: b.shiftId,
    from_emp_id: b.fromEmpId, to_emp_id: source === 'market' && kind === 'full' ? null : (b.toEmpId || null),
    to_date: b.toDate || null, to_shift_id: b.toShiftId || null,
    direction: b.direction || null, edge: b.edge || null, boundary_time: b.boundaryTime || null,
    note: b.note || '',
  }

  if (kind === 'partial' && source === 'market') {
    // לוח פתוח בלבד — אין השלמה אוטומטית, נשאר open עד שהמבקש מבטל
    row.status = 'open'
  } else if (kind === 'hole') {
    // תמיד מיידי, בלי אישור מאף אחד
    row.status = 'approved'
  } else if (kind === 'full' && source === 'market') {
    row.status = 'open' // ממתין לתופס; אישור עובד לא רלוונטי כאן — הלחיצה שלו היא ההסכמה
  } else {
    // direct: full או partial — לפי ה-toggles
    const s = await getSwapSettings(sb)
    const needPeer = kind === 'full' ? s.peerApprovalFull : s.peerApprovalPartial
    const needMgr = kind === 'full' ? s.managerApprovalFull : s.managerApprovalPartial
    row.status = needPeer ? 'pending_peer' : (needMgr ? 'pending_manager' : 'approved')
  }

  const { data: inserted, error } = await sb.from('shift_swap_requests').insert(row).select().single()
  if (error) throw error

  if (row.status === 'approved') await applyRequest(sb, inserted)
  await notifyForStatus(sb, inserted, 'created')
  return { request: await refetch(sb, inserted.id) }
}

// ---- respond (peer/manager accept|reject) ----
async function respond(sb: any, b: any) {
  const { data: r, error: e0 } = await sb.from('shift_swap_requests').select('*').eq('id', b.requestId).single()
  if (e0 || !r) throw new Error('בקשה לא נמצאה')
  const role = b.role as 'peer' | 'manager'
  const expected = role === 'peer' ? 'pending_peer' : 'pending_manager'
  if (r.status !== expected) return { request: r, note: 'הבקשה כבר טופלה' }

  if (b.decision === 'reject') {
    const { data: updated } = await sb.from('shift_swap_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString(), responded_by: b.respondedBy || null })
      .eq('id', r.id).select().single()
    await notifyForStatus(sb, updated, 'rejected')
    return { request: updated }
  }

  // accept
  let nextStatus = 'approved'
  if (role === 'peer') {
    const s = await getSwapSettings(sb)
    const needMgr = r.kind === 'full' ? s.managerApprovalFull : s.managerApprovalPartial
    if (needMgr) nextStatus = 'pending_manager'
  }
  const { data: updated } = await sb.from('shift_swap_requests')
    .update({ status: nextStatus, responded_at: new Date().toISOString(), responded_by: b.respondedBy || null })
    .eq('id', r.id).select().single()

  if (nextStatus === 'approved') await applyRequest(sb, updated)
  await notifyForStatus(sb, updated, nextStatus === 'approved' ? 'applied' : 'advanced')
  return { request: await refetch(sb, r.id) }
}

// ---- claim (market, kind='full' only) ----
async function claim(sb: any, b: any) {
  const { data: r, error: e0 } = await sb.from('shift_swap_requests').select('*').eq('id', b.requestId).single()
  if (e0 || !r) throw new Error('בקשה לא נמצאה')
  if (r.kind !== 'full' || r.source !== 'market' || r.status !== 'open') {
    return { request: r, note: 'הבקשה כבר לא פתוחה' }
  }
  const s = await getSwapSettings(sb)
  const nextStatus = s.managerApprovalFull ? 'pending_manager' : 'approved'
  const { data: updated } = await sb.from('shift_swap_requests')
    .update({ to_emp_id: b.claimerEmpId, status: nextStatus })
    .eq('id', r.id).select().single()

  if (nextStatus === 'approved') await applyRequest(sb, updated)
  await notifyForStatus(sb, updated, nextStatus === 'approved' ? 'applied' : 'claimed')
  return { request: await refetch(sb, r.id) }
}

// ---- cancel ----
async function cancel(sb: any, b: any) {
  const { data: r } = await sb.from('shift_swap_requests').select('*').eq('id', b.requestId).single()
  if (!r) throw new Error('בקשה לא נמצאה')
  if (r.from_emp_id !== b.byEmpId) throw new Error('רק מי שיצר את הבקשה יכול לבטל אותה')
  if (!['open', 'pending_peer', 'pending_manager'].includes(r.status)) return { request: r, note: 'לא ניתן לבטל בקשה שכבר טופלה' }
  const { data: updated } = await sb.from('shift_swap_requests').update({ status: 'cancelled' }).eq('id', r.id).select().single()
  return { request: updated }
}

async function refetch(sb: any, id: string) {
  const { data } = await sb.from('shift_swap_requests').select('*').eq('id', id).single()
  return data
}

// ---- apply: the actual schedule/override mutation, written to both live and source-of-truth copies ----
async function applyRequest(sb: any, r: any) {
  const [{ data: pub }, { data: stateRow }] = await Promise.all([
    sb.from('published_schedules').select('*').eq('month', r.month).maybeSingle(),
    sb.from('mishmarot_state').select('data').eq('id', 'main').maybeSingle(),
  ])
  const state = stateRow?.data || {}

  let pubSchedule = pub?.schedule || {}
  let pubSettings = pub?.shift_settings || {}
  let stateSettings = state.shiftSettings || {}
  const drafts = state.drafts || []
  const ds = drafts.filter((d: any) => d.month === r.month)
  const draft = ds.find((d: any) => d.status === 'final') || ds[ds.length - 1]

  if (r.kind === 'full') {
    pubSchedule = swapInSchedule(pubSchedule, r.date, r.shift_id, r.from_emp_id, r.to_emp_id)
    pubSettings = clearPersonOverride(pubSettings, r.date, r.shift_id, r.from_emp_id)
    stateSettings = clearPersonOverride(stateSettings, r.date, r.shift_id, r.from_emp_id)
    if (draft) draft.schedule = swapInSchedule(draft.schedule || {}, r.date, r.shift_id, r.from_emp_id, r.to_emp_id)
  } else {
    // partial | hole: כתיבת שעה אישית. hole אין לו צד שני.
    pubSettings = setPersonOverride(pubSettings, r.date, r.shift_id, r.from_emp_id, r.edge, r.boundary_time)
    stateSettings = setPersonOverride(stateSettings, r.date, r.shift_id, r.from_emp_id, r.edge, r.boundary_time)
    if (r.kind === 'partial' && r.to_emp_id) {
      const oppEdge = r.edge === 'start' ? 'end' : 'start'
      pubSettings = setPersonOverride(pubSettings, r.to_date, r.to_shift_id, r.to_emp_id, oppEdge, r.boundary_time)
      stateSettings = setPersonOverride(stateSettings, r.to_date, r.to_shift_id, r.to_emp_id, oppEdge, r.boundary_time)
    }
  }

  const writes: Promise<any>[] = []
  if (pub) writes.push(sb.from('published_schedules').update({ schedule: pubSchedule, shift_settings: pubSettings }).eq('month', r.month))
  const newState = { ...state, shiftSettings: stateSettings, drafts: draft ? drafts.map((d: any) => d.id === draft.id ? draft : d) : drafts }
  writes.push(sb.from('mishmarot_state').upsert({ id: 'main', data: newState, updated_at: new Date().toISOString() }))
  writes.push(sb.from('shift_swap_requests').update({ applied_at: new Date().toISOString() }).eq('id', r.id))
  await Promise.all(writes)
}

function swapInSchedule(schedule: any, date: string, shiftId: string, fromId: string, toId: string) {
  const day = schedule[date] || {}
  const arr = (day[shiftId] || []).filter((id: string) => id !== fromId)
  if (toId && !arr.includes(toId)) arr.push(toId)
  return { ...schedule, [date]: { ...day, [shiftId]: arr } }
}

function clearPersonOverride(settings: any, date: string, shiftId: string, empId: string) {
  const all = settings?._overrides
  if (!all?.[date]?.[shiftId]?.per?.[empId]) return settings
  const per = { ...all[date][shiftId].per }
  delete per[empId]
  const ov = { ...all[date][shiftId], per }
  const day = { ...all[date], [shiftId]: ov }
  return { ...settings, _overrides: { ...all, [date]: day } }
}

function setPersonOverride(settings: any, date: string, shiftId: string, empId: string, edge: string, time: string) {
  const all = { ...(settings?._overrides || {}) }
  const day = { ...(all[date] || {}) }
  const ov = { ...(day[shiftId] || {}) }
  const per = { ...(ov.per || {}) }
  per[empId] = { ...(per[empId] || {}), [edge]: time }
  ov.per = per
  day[shiftId] = ov
  all[date] = day
  return { ...settings, _overrides: all }
}

// ---- notifications ----
async function notifyForStatus(sb: any, r: any, event: string) {
  try {
    const { data: stateRow } = await sb.from('mishmarot_state').select('data').eq('id', 'main').maybeSingle()
    const state = stateRow?.data || {}
    const names = namesOf(state)
    const label = KIND_LABEL[r.kind] || 'משמרת'
    const dateLabel = r.date

    if (r.kind === 'hole' && event === 'created') {
      return // רישום בלבד — אין למי להתריע חוץ מהמשבץ, שרואה זאת בלוח
    }
    if (r.source === 'market' && (event === 'created')) {
      return // מתפרסם בבאנר; אין יעד ספציפי להתראה עדיין
    }

    if (event === 'created' && r.status === 'pending_peer' && r.to_emp_id) {
      await notify(sb, state, r.to_emp_id, 'הצעת חילוף חדשה', `${names[r.from_emp_id] || 'מישהו'} מציע/ה לך ${label} ב-${dateLabel}`, r.id)
    } else if (event === 'created' && r.status === 'approved' && r.to_emp_id) {
      await notify(sb, state, r.to_emp_id, 'קיבלת משמרת', `${names[r.from_emp_id] || 'מישהו'} מסר/ה לך ${label} ב-${dateLabel}`, r.id)
    } else if (event === 'claimed') {
      await notify(sb, state, r.from_emp_id, 'המשמרת שלך נתפסה', `${names[r.to_emp_id] || 'מישהו'} ייקח/תיקח את ${label} שלך ב-${dateLabel} — ממתין לאישור המשבץ`, r.id)
    } else if (event === 'applied') {
      await notify(sb, state, r.from_emp_id, 'החילוף אושר', `החילוף שלך ל-${dateLabel} אושר וכבר עודכן בסידור`, r.id)
      if (r.to_emp_id) await notify(sb, state, r.to_emp_id, 'החילוף אושר', `החילוף עם ${names[r.from_emp_id] || 'עמית'} ל-${dateLabel} אושר וכבר עודכן בסידור`, r.id)
    } else if (event === 'advanced') {
      await notify(sb, state, r.from_emp_id, 'החילוף ממתין לאישור המשבץ', `הבקשה שלך ל-${dateLabel} אושרה על ידי העמית, וממתינה עכשיו לאישור המשבץ`, r.id)
    } else if (event === 'rejected') {
      await notify(sb, state, r.from_emp_id, 'הבקשה נדחתה', `הבקשה שלך ל-${dateLabel} נדחתה`, r.id)
    }
  } catch (e) {
    console.warn('notifyForStatus failed', e)
  }
}

async function notify(sb: any, state: any, empId: string, title: string, body: string, tag: string) {
  await sb.from('pending_notifications').insert({ emp_id: empId, title, body, tag: 'swap:' + tag })
  const { data: sub } = await sb.from('push_subscriptions').select('subscription').eq('emp_id', empId).maybeSingle()
  const vapidPublicKey = state?.vapidPublicKey
  const vapidPrivateKeyJwk = state?.vapidPrivateKeyJwk
  if (!sub || !vapidPublicKey || !vapidPrivateKeyJwk) return
  try {
    await sendWebPush(sub.subscription, vapidPublicKey, vapidPrivateKeyJwk)
  } catch (e: any) {
    if (String(e.message).includes('410')) await sb.from('push_subscriptions').delete().eq('emp_id', empId)
  }
}

const KIND_LABEL: Record<string, string> = { full: 'משמרת', partial: 'חלק ממשמרת', hole: 'קיצור משמרת' }

async function sendWebPush(subJson: unknown, vapidPublicKey: string, vapidPrivateKeyJwk: unknown) {
  const sub: any = typeof subJson === 'string' ? JSON.parse(subJson) : subJson
  const endpoint: string = sub.endpoint
  const origin = new URL(endpoint).origin
  const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const sigInput = enc({ alg: 'ES256', typ: 'JWT' }) + '.' + enc({ aud: origin, exp: now + 12 * 3600, sub: 'mailto:admin@mishmarot.app' })
  const privKey = await crypto.subtle.importKey('jwk', vapidPrivateKeyJwk as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sigBytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput))
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `vapid t=${sigInput}.${sig},k=${vapidPublicKey}`, 'TTL': '86400' },
  })
  if (!res.ok && res.status !== 201) throw new Error(`Push ${res.status}: ${await res.text().catch(() => '')}`)
}
