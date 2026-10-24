import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

// Cancelación con reembolso prorrateado NO — se usa cancel_at_period_end:
// el doctor mantiene acceso hasta el final del periodo pagado.
export async function POST(request: Request) {
    try {
        let reason = ''
        try {
            const body = await request.json()
            reason = (body.reason as string) || ''
        } catch {
            // body vacío es válido
        }

        // Usuario autenticado — SIEMPRE getUser()
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    },
                },
            }
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )

        const { data: sub } = await admin
            .from('subscriptions')
            .select('id, stripe_subscription_id, status')
            .eq('user_id', user.id)
            .not('stripe_subscription_id', 'is', null)
            .limit(1)
            .maybeSingle()

        if (!sub?.stripe_subscription_id) {
            return NextResponse.json({ error: 'No tienes una suscripción activa con Stripe' }, { status: 404 })
        }

        // Cancelar al final del periodo pagado (mantiene acceso hasta esa fecha)
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true,
        })

        await admin
            .from('subscriptions')
            .update({
                canceled_at: new Date().toISOString(),
                cancel_reason: reason || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id)

        return NextResponse.json({ success: true })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cancelar la suscripción'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
