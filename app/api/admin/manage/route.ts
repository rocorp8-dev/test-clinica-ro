import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

// Acciones del panel admin: extender trial / activar manualmente (pagos SPEI)
export async function POST(request: Request) {
    try {
        const adminKey = request.headers.get('x-admin-key') || ''
        // ⚠️ Si ADMIN_SECRET_KEY no está configurado, NADIE entra (nunca aceptar clave vacía)
        if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const action = body.action as string
        const userId = body.user_id as string

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
        }

        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )

        if (action === 'extend_trial') {
            // +30 días al trial desde hoy
            const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

            const { error: pErr } = await admin
                .from('profiles')
                .update({ trial_ends_at: newEnd, is_trial: true, subscription_status: 'trialing' })
                .eq('id', userId)
            if (pErr) throw pErr

            await admin
                .from('user_profiles')
                .update({ trial_ends_at: newEnd })
                .eq('id', userId)

            await admin
                .from('subscriptions')
                .update({
                    status: 'trialing',
                    current_period_end: newEnd,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)

            return NextResponse.json({ success: true, trial_ends_at: newEnd })
        }

        if (action === 'activate') {
            // Activación manual (pago SPEI): 1 año de acceso
            const newEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

            const { error: pErr } = await admin
                .from('profiles')
                .update({ is_trial: false, subscription_status: 'active' })
                .eq('id', userId)
            if (pErr) throw pErr

            const { data: existing } = await admin
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle()

            const row = {
                status: 'active',
                payment_method: 'spei',
                billing_cycle: 'annual',
                current_period_start: new Date().toISOString(),
                current_period_end: newEnd,
                updated_at: new Date().toISOString(),
            }

            if (existing) {
                await admin.from('subscriptions').update(row).eq('id', existing.id)
            } else {
                await admin.from('subscriptions').insert({ user_id: userId, plan: 'basico', ...row })
            }

            return NextResponse.json({ success: true, current_period_end: newEnd })
        }

        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error en la acción'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
