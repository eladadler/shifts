/**
 * shift-reminders — runs on cron every 30 min (see supabase-setup.sql for schedule).
 * Reads push subscriptions + prefs, finds upcoming shifts, sends push + pending_notification.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = Date.now()
  const WINDOW_MS = 30 * 60 * 1000  // ±30 min window around the alert time

  // Current and next month
  const d = new Date()
  const ym1 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const nxt = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const ym2 = `${nxt.getFullYear()}-${String(nxt.getMonth() + 1).padStart(2, '0')}`

  const [{ data: schedules }, { data: subs }, { data: stateRow }] = await Promise.all([
    sb.from('published_schedules').select('month,schedule,shift_settings').in('month', [ym1, ym2]),
    sb.from('push_subscriptions').select('emp_id,subscription,prefs'),
    sb.from('mishmarot_state').select('data').eq('id', 'main').single(),
  ])

  if (!schedules?.length || !subs?.length) return ok({ sent: 0, reason: 'no data' })

  const vapidPublicKey: string = stateRow?.data?.vapidPublicKey
  const vapidPrivateKeyJwk = stateRow?.data?.vapidPrivateKeyJwk
  if (!vapidPublicKey || !vapidPrivateKeyJwk) return ok({ sent: 0, reason: 'no vapid' })

  const LABELS: Record<string, string> = { morning: 'בוקר', evening: 'ערב', afternoon: 'צהריים', night: 'לילה', short: 'קצר' }
  let sent = 0

  for (const sub of (subs as any[])) {
    const prefs = sub.prefs || { alert24h: true, alertCustom: false, alertCustomHours: 2 }
    const alerts: { label: string; hours: number }[] = []
    if (prefs.alert24h) alerts.push({ label: '24h', hours: 24 })
    if (prefs.alertCustom && Number(prefs.alertCustomHours) > 0) {
      const h = Number(prefs.alertCustomHours)
      const lbl = h >= 1 ? `${h}h` : `${Math.round(h * 60)}m`
      alerts.push({ label: lbl, hours: h })
    }
    if (!alerts.length) continue

    for (const sched of (schedules as any[])) {
      const schedule: Record<string, Record<string, string[]>> = sched.schedule || {}
      const ss = sched.shift_settings || null

      for (const [dateStr, shifts] of Object.entries(schedule)) {
        for (const [shiftId, empIds] of Object.entries(shifts || {})) {
          if (!(empIds as string[]).includes(sub.emp_id)) continue

          const startMs = shiftStartMs(shiftId, dateStr, ss)
          if (startMs < now - WINDOW_MS) continue

          for (const { label, hours } of alerts) {
            const alertMs = startMs - hours * 3600000
            if (now < alertMs - WINDOW_MS || now > alertMs + WINDOW_MS) continue

            const tag = `sr:${sub.emp_id}:${dateStr}:${shiftId}:${label}`

            // Skip if already sent in the last 2 hours
            const { data: existing } = await sb.from('pending_notifications')
              .select('id').eq('tag', tag)
              .gt('created_at', new Date(now - 2 * 3600000).toISOString())
              .limit(1)
            if (existing?.length) continue

            const msUntil = startMs - now
            const title = 'תזכורת משמרת'
            let timeStr = ''
            if (msUntil > 0) {
              const hoursUntil = msUntil / 3600000
              if (hoursUntil >= 1) timeStr = ` — בעוד כ-${Math.round(hoursUntil)} שעות`
              else timeStr = ` — בעוד כ-${Math.round(msUntil / 60000)} דקות`
            }
            const body = `משמרת ${LABELS[shiftId] || shiftId} ב-${dateStr}${timeStr}`

            await sb.from('pending_notifications').insert({ emp_id: sub.emp_id, title, body, tag })

            try {
              await sendWebPush(sub.subscription, vapidPublicKey, vapidPrivateKeyJwk)
              sent++
            } catch (e: any) {
              if (String(e.message).includes('410'))
                await sb.from('push_subscriptions').delete().eq('emp_id', sub.emp_id)
              console.warn('push failed', sub.emp_id, e.message)
            }
          }
        }
      }
    }
  }

  return ok({ sent })
})

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
}

// ---- shift timing helpers (mirrors sw.js logic) ----
function shiftStartMs(shiftId: string, dateStr: string, ss: any): number {
  const [y, mo, day] = dateStr.split('-').map(Number)
  const wd = new Date(y, mo - 1, day).getDay()
  let arr: { id: string; start: string }[] | undefined
  if (ss) {
    if (wd === 6) arr = ss.saturday || ss.weekend
    else if (wd === 5) arr = ss.friday || ss.weekend
    else arr = ss.weekday
  }
  if (!arr) {
    arr = (wd === 5 || wd === 6)
      ? [{ id: 'morning', start: '07:00' }, { id: 'short', start: '15:00' }, { id: 'night', start: '19:00' }]
      : [{ id: 'morning', start: '07:00' }, { id: 'evening', start: '15:00' }, { id: 'night', start: '23:00' }]
  }
  const startStr = arr.find(s => s.id === shiftId)?.start || '08:00'
  const [h, m] = startStr.split(':').map(Number)
  return new Date(y, mo - 1, day, h, m).getTime()
}

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
