import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe, getPriceId, type PlanId, type BillingCycle } from '@/lib/stripe'
import { safeErrorMessage } from '@/lib/logger'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const plan = body.plan as PlanId
        const billing = (body.billing as BillingCycle) || 'monthly'

        if (!plan || !['basico', 'pro', 'clinica'].includes(plan)) {
            return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
        }
        if (!['monthly', 'annual'].includes(billing)) {
            return NextResponse.json({ error: 'Ciclo de facturación inválido' }, { status: 400 })
        }

        // Usuario autenticado — SIEMPRE getUser(), nunca getSession()
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

        const priceId = getPriceId(plan, billing)
        if (!priceId) {
            return NextResponse.json({ error: 'Precio de Stripe no configurado para este plan' }, { status: 500 })
        }

        // Cliente admin para escribir/leer sin RLS
        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )

        // Buscar o crear Stripe Customer por el email del doctor
        const { data: existingSub } = await admin
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .not('stripe_customer_id', 'is', null)
            .limit(1)
            .maybeSingle()

        let customerId = existingSub?.stripe_customer_id || ''

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                metadata: { user_id: user.id },
            })
            customerId = customer.id
        }

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://mdpulso.vercel.app'

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${origin}/precios`,
            metadata: { user_id: user.id, plan },
            subscription_data: { metadata: { user_id: user.id, plan } },
        })

        return NextResponse.json({ url: session.url })
    } catch (err) {
        return NextResponse.json({ error: safeErrorMessage(err, 'Error creando sesión de pago') }, { status: 500 })
    }
}
