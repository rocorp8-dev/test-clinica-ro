import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })
}

export async function POST(request: Request) {
  // Validar secret (solo si está configurado y el cliente lo manda)
  const secret = request.headers.get('x-webhook-secret') || request.headers.get('authorization')?.replace('Bearer ', '')
  if (WEBHOOK_SECRET && secret && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Payload de Supabase Database Webhook
  const record = (body.record ?? body) as Record<string, unknown>
  const email = record.email as string ?? 'Sin email'
  const fullName = record.full_name as string ?? email
  const trialEndsAt = record.trial_ends_at as string ?? ''
  const createdAt = record.created_at as string ?? new Date().toISOString()

  const fecha = new Date(createdAt).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const trialFecha = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '14 dias desde hoy'

  const mensaje = `<b>Nuevo doctor registrado en MDPulso</b>

<b>Nombre:</b> ${fullName}
<b>Email:</b> ${email}
<b>Registrado:</b> ${fecha}
<b>Trial hasta:</b> ${trialFecha}

<i>Contáctalo pronto — el interes está caliente.</i>`

  await sendTelegram(mensaje)

  // Marcar notified_at en user_profiles
  if (record.id) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase
      .from('user_profiles')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', record.id)
  }

  return NextResponse.json({ ok: true })
}
