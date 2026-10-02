/**
 * ai — מעביר בקשות Claude משתי האפליקציות, כך שמפתח ה-API נשמר רק כסוד בשרת (ANTHROPIC_API_KEY)
 * ולא מגיע לדפדפן, לריפו או ל-mishmarot_state.
 *
 * POST { action: 'whoami' }                         → { role, email, managersConfigured }
 * POST { action: 'messages', body: { model, max_tokens, system, messages, tools?, tool_choice? } } → Message
 *
 * דורש משתמש מחובר (Authorization: Bearer <access token של Supabase Auth>).
 * manager = אימייל ברשימת הסוד MANAGER_EMAILS (מופרד בפסיקים) — שימוש מלא.
 * worker  = אימייל שמופיע ב-app_employees — עד 1024 טוקנים, בלי כלים.
 * כל השאר נדחים, כך שאי אפשר להשתמש בקרדיט בלי להתחבר כמשבץ/עובד.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODELS = new Set(['claude-sonnet-4-6'])
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = { manager: 16000, worker: 1024 }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data } = token ? await sb.auth.getUser(token) : { data: { user: null } }
    const email = data?.user?.email?.toLowerCase()
    if (!email) return json({ error: 'נדרשת התחברות' }, 401)

    const managers = (Deno.env.get('MANAGER_EMAILS') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const role = managers.includes(email) ? 'manager' : (await isEmployee(sb, email)) ? 'worker' : 'none'

    const body = await req.json().catch(() => ({}))
    if (body.action === 'whoami') return json({ role, email, managersConfigured: managers.length > 0 })
    if (body.action !== 'messages') return json({ error: 'unknown action' }, 400)
    if (role === 'none') return json({ error: 'אין הרשאה לשימוש ב-AI לחשבון הזה' }, 403)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'מפתח ה-AI לא הוגדר בשרת (ANTHROPIC_API_KEY)' }, 500)

    const p = body.body || {}
    if (!Array.isArray(p.messages) || !p.messages.length) return json({ error: 'חסרות הודעות' }, 400)
    const params: Record<string, unknown> = {
      model: MODELS.has(p.model) ? p.model : DEFAULT_MODEL,
      max_tokens: Math.min(Number(p.max_tokens) || 1024, MAX_TOKENS[role as 'manager' | 'worker']),
      messages: p.messages,
    }
    if (p.system) params.system = p.system
    if (role === 'manager' && Array.isArray(p.tools)) {
      params.tools = p.tools
      if (p.tool_choice) params.tool_choice = p.tool_choice
    }

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create(params as any)
    return json(msg)
  } catch (e: any) {
    if (e instanceof Anthropic.APIError) return json({ error: e.message }, e.status || 502)
    console.error('ai error:', e)
    return json({ error: e?.message || String(e) }, 500)
  }
})

async function isEmployee(sb: any, email: string) {
  const pattern = email.replace(/[\\%_]/g, (c) => '\\' + c)
  const { data } = await sb.from('app_employees').select('id').ilike('email', pattern).limit(1)
  return !!data?.length
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
