import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { stripe, planFromPriceId, mapStripeStatus, getPeriod, type PlanId, type BillingCycle } from '@/lib/stripe'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

async function sendTelegram(text: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    })
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
}

function refId(ref: string | { id?: string } | null | undefined): string {
    if (!ref) return ''
    return typeof ref === 'string' ? ref : ref.id || ''
}

function intervalToCycle(interval: string | undefined): BillingCycle {
    return interval === 'year' ? 'annual' : 'monthly'
}

// ── checkout.session.completed → crear/activar suscripción en DB ────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return

    const userId = session.metadata?.user_id || ''
    const planMeta = (session.metadata?.plan as PlanId) || 'basico'
    const stripeSubId = refId(session.subscription)
    if (!userId || !stripeSubId) return

    const sub = await stripe.subscriptions.retrieve(stripeSubId)
    const item = sub.items.data[0]
    const priceId = item?.price?.id || ''
    const fromPrice = planFromPriceId(priceId)
    const plan: PlanId = fromPrice?.plan || planMeta
    const billing: BillingCycle = fromPrice?.billing || intervalToCycle(item?.price?.recurring?.interval)
    const period = getPeriod(sub as unknown as Parameters<typeof getPeriod>[0])
    const status = mapStripeStatus(sub.status)

    const db = admin()
    const row = {
        user_id: userId,
        plan,
        status,
        billing_cycle: billing,
        payment_method: 'stripe',
        stripe_customer_id: refId(sub.customer),
        stripe_subscription_id: stripeSubId,
        current_period_start: period.start,
        current_period_end: period.end,
        updated_at: new Date().toISOString(),
    }

    const { data: existing } = await db
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

    if (existing) {
        await db.from('subscriptions').update(row).eq('id', existing.id)
    } else {
        await db.from('subscriptions').insert(row)
    }

    // Activar perfil: fin de trial inmediato + estado activo
    await db
        .from('profiles')
        .update({
            is_trial: false,
            subscription_status: status === 'trialing' ? 'active' : status,
            current_plan: plan,
        })
        .eq('id', userId)
}

// ── customer.subscription.updated → sincronizar status y periodo ───────────
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
    const db = admin()
    const stripeSubId = refId(sub.id)
    const { data: existing } = await db
        .from('subscriptions')
        .select('id, user_id, plan')
        .eq('stripe_subscription_id', stripeSubId)
        .limit(1)
        .maybeSingle()
    if (!existing) return

    const item = sub.items.data[0]
    const fromPrice = planFromPriceId(item?.price?.id || '')
    const period = getPeriod(sub as unknown as Parameters<typeof getPeriod>[0])
    const status = mapStripeStatus(sub.status)

    await db
        .from('subscriptions')
        .update({
            plan: fromPrice?.plan || existing.plan,
            billing_cycle: fromPrice?.billing || intervalToCycle(item?.price?.recurring?.interval),
            status,
            stripe_customer_id: refId(sub.customer),
            current_period_start: period.start,
            current_period_end: period.end,
            updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

    // Mantener profiles sincronizado para el middleware
    await db
        .from('profiles')
        .update({ subscription_status: status === 'trialing' ? 'active' : status })
        .eq('id', existing.user_id)
}

// ── customer.subscription.deleted → cancelada al final del periodo ─────────
// El usuario mantuvo acceso hasta current_period_end (cancel_at_period_end).
// Al llegar este evento, el periodo pagado terminó: se corta el acceso.
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
    const db = admin()
    const stripeSubId = refId(sub.id)
    const { data: existing } = await db
        .from('subscriptions')
        .select('id, user_id')
        .eq('stripe_subscription_id', stripeSubId)
        .limit(1)
        .maybeSingle()
    if (!existing) return

    await db
        .from('subscriptions')
        .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

    await db
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', existing.user_id)
}

// ── invoice.payment_failed → past_due + notificación Telegram ──────────────
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const db = admin()
    const customerId = refId(invoice.customer as string | { id?: string })

    const { data: existing } = await db
        .from('subscriptions')
        .select('id, user_id, plan')
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle()
    if (!existing) return

    await db
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('id', existing.id)

    await db
        .from('profiles')
        .update({ subscription_status: 'past_due' })
        .eq('id', existing.user_id)

    const { data: profile } = await db
        .from('profiles')
        .select('email, full_name')
        .eq('id', existing.user_id)
        .maybeSingle()

    await sendTelegram(
        `<b>⚠️ Pago fallido en MDPulso</b>\n\n<b>Doctor:</b> ${profile?.full_name || 'Desconocido'}\n<b>Email:</b> ${profile?.email || 'N/A'}\n<b>Plan:</b> ${existing.plan}\n\n<i>Revisar en Stripe Dashboard.</i>`
    )
}

export async function POST(request: Request) {
    // Body RAW para verificar la firma — NUNCA request.json()
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    if (!signature || !webhookSecret) {
        return NextResponse.json({ error: 'Webhook no configurado' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Firma inválida'
        return NextResponse.json({ error: `Firma inválida: ${message}` }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
                break
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
                break
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                break
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
                break
            default:
                // Eventos no manejados se confirman igualmente
                break
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error procesando evento'
        return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
