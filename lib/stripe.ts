import Stripe from 'stripe'

// Cliente Stripe singleton.
// apiVersion pineada a '2024-12-18.acacia' según configuración del proyecto.
// El cast es necesario porque el SDK tipa apiVersion como LatestApiVersion;
// Stripe acepta cualquier versión soportada de la cuenta.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    typescript: true,
})

export type PlanId = 'basico' | 'pro' | 'clinica'
export type BillingCycle = 'monthly' | 'annual'

// Mapeo de precios creados en la cuenta Stripe del proyecto
const PRICE_IDS: Record<PlanId, Record<BillingCycle, string>> = {
    basico: {
        monthly: process.env.STRIPE_PRICE_BASICO_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_BASICO_ANNUAL || '',
    },
    pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
    },
    clinica: {
        monthly: process.env.STRIPE_PRICE_CLINICA_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_CLINICA_ANNUAL || '',
    },
}

export function getPriceId(plan: PlanId, billing: BillingCycle): string {
    return PRICE_IDS[plan]?.[billing] || ''
}

// Lookup inverso para webhooks: price_id → { plan, billing }
export function planFromPriceId(priceId: string): { plan: PlanId; billing: BillingCycle } | null {
    for (const plan of Object.keys(PRICE_IDS) as PlanId[]) {
        for (const billing of Object.keys(PRICE_IDS[plan]) as BillingCycle[]) {
            if (PRICE_IDS[plan][billing] && PRICE_IDS[plan][billing] === priceId) {
                return { plan, billing }
            }
        }
    }
    return null
}

// Map de estados Stripe → estados válidos en public.subscriptions
export function mapStripeStatus(status: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' {
    switch (status) {
        case 'trialing': return 'trialing'
        case 'active': return 'active'
        case 'past_due':
        case 'unpaid':
        case 'paused': return 'past_due'
        case 'canceled': return 'canceled'
        case 'incomplete_expired': return 'expired'
        default: return 'trialing'
    }
}

// Helper tolerante a versiones: el periodo puede venir en la suscripción
// (apiVersion acacia) o en sus items (apiVersion basil+).
export function getPeriod(sub: {
    current_period_start?: number | null
    current_period_end?: number | null
    items?: { data?: Array<{ current_period_start?: number | null; current_period_end?: number | null }> }
}): { start: string | null; end: string | null } {
    const start = sub.current_period_start ?? sub.items?.data?.[0]?.current_period_start ?? null
    const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null
    return {
        start: start ? new Date(start * 1000).toISOString() : null,
        end: end ? new Date(end * 1000).toISOString() : null,
    }
}
