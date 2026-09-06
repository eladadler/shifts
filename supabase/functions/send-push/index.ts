import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { empIds, title, body, scheduleId } = await req.json()

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Write pending_notifications (SW reads these and shows them)
    const tag = scheduleId || ('notif-' + Date.now())
    await sb.from('pending_notifications').insert(
      (empIds as string[]).map(emp_id => ({ emp_id, title, body, tag }))
    )

    // 2. Fetch push subscriptions
    const { data: subs, error: subErr } = await sb
      .from('push_subscriptions').select('emp_id, subscription').in('emp_id', empIds)
    if (subErr) throw subErr
    if (!subs?.length) return json({ sent: 0, errors: 0, noSubs: true })

    // 3. Get VAPID keys
    const { data: stateRow } = await sb
      .from('mishmarot_state').select('data').eq('id', 'main').single()
    const vapidPublicKey: string = stateRow?.data?.vapidPublicKey
    const vapidPrivateKeyJwk = stateRow?.data?.vapidPrivateKeyJwk
    if (!vapidPublicKey || !vapidPrivateKeyJwk) return json({ sent: 0, errors: 0, noVapid: true })

    // 4. Send Web Push to each subscription (no CORS restrictions server-side)
    let sent = 0
    const errMsgs: string[] = []
    for (const sub of subs) {
      try {
        await sendWebPush(sub.subscription, vapidPublicKey, vapidPrivateKeyJwk)
        sent++
      } catch (e: any) {
        console.warn('Push failed for', sub.emp_id, e)
        errMsgs.push(e.message || String(e))
      }
    }
    return json({ sent, errors: errMsgs.length, errMsgs })

  } catch (e: any) {
    console.error('send-push error:', e)
    return json({ sent: 0, errors: 1, errMsgs: [e.message || String(e)] }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sendWebPush(subJson: unknown, vapidPublicKey: string, vapidPrivateKeyJwk: unknown) {
  const sub: any = typeof subJson === 'string' ? JSON.parse(subJson) : subJson
  const endpoint: string = sub.endpoint
  const origin = new URL(endpoint).origin

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const sigInput = enc({ alg: 'ES256', typ: 'JWT' }) + '.' +
    enc({ aud: origin, exp: now + 12 * 3600, sub: 'mailto:admin@mishmarot.app' })

  const privKey = await crypto.subtle.importKey(
    'jwk', vapidPrivateKeyJwk as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const jwt = sigInput + '.' + sig

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`, 'TTL': '86400' },
  })
  if (!res.ok && res.status !== 201) {
    throw new Error(`Push ${res.status}: ${await res.text().catch(() => '')}`)
  }
}
