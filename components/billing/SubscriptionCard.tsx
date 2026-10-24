'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import {
    CreditCard,
    CalendarClock,
    RefreshCw,
    Loader2,
    Sparkles,
    ExternalLink,
    XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import CancelModal from './CancelModal'

interface SubData {
    plan: string
    status: string
    billing_cycle: string | null
    payment_method: string | null
    current_period_end: string | null
    canceled_at: string | null
}

const PLAN_LABELS: Record<string, string> = {
    basico: 'Básico',
    pro: 'Pro+',
    clinica: 'Clínica',
}

const STATUS_META: Record<string, { label: string; className: string }> = {
    trialing: { label: 'Prueba gratuita', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    active: { label: 'Activa', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    past_due: { label: 'Pago pendiente', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    canceled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    expired: { label: 'Expirada', className: 'bg-red-50 text-red-700 border-red-200' },
}

const PAYMENT_LABELS: Record<string, string> = {
    stripe: 'Tarjeta (Stripe)',
    spei: 'Transferencia SPEI',
    manual: 'Activación manual',
    pending: 'Sin método de pago',
}

export default function SubscriptionCard() {
    const [sub, setSub] = useState<SubData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCancel, setShowCancel] = useState(false)
    const [portalLoading, setPortalLoading] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    const loadSubscription = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('subscriptions')
                .select('plan, status, billing_cycle, payment_method, current_period_end, canceled_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            setSub(data ?? null)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadSubscription()
    }, [loadSubscription])

    const openPortal = async () => {
        setPortalLoading(true)
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' })
            const data = await res.json()
            if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo abrir el portal')
            window.location.href = data.url
        } catch (err) {
            toast.error('Portal de pagos no disponible', {
                description: err instanceof Error ? err.message : 'Intenta de nuevo',
            })
            setPortalLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
        )
    }

    const statusMeta = STATUS_META[sub?.status || 'trialing'] || STATUS_META.trialing
    const periodEnd = sub?.current_period_end
        ? new Date(sub.current_period_end).toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: '2-digit', month: 'long', year: 'numeric',
        })
        : null

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 md:p-8"
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan actual</p>
                            <h3 className="text-xl font-bold text-slate-900 font-display">
                                {PLAN_LABELS[sub?.plan || 'basico'] || sub?.plan || 'Sin plan'}
                                {sub?.billing_cycle === 'annual' && (
                                    <span className="ml-2 text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">ANUAL</span>
                                )}
                                {sub?.billing_cycle === 'monthly' && (
                                    <span className="ml-2 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">MENSUAL</span>
                                )}
                            </h3>
                        </div>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-xl border font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <CalendarClock className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Próxima renovación</p>
                            <p className="text-sm font-semibold text-slate-700">{periodEnd || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <CreditCard className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Método de pago</p>
                            <p className="text-sm font-semibold text-slate-700">
                                {PAYMENT_LABELS[sub?.payment_method || 'pending'] || sub?.payment_method || '—'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/precios"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Cambiar plan
                    </Link>
                    <button
                        onClick={openPortal}
                        disabled={portalLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-100 text-slate-700 text-sm font-bold hover:border-emerald-200 hover:bg-emerald-50/50 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {portalLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ExternalLink className="h-4 w-4" />
                        )}
                        Gestionar tarjeta
                    </button>
                    {sub?.status !== 'canceled' && sub?.status !== 'expired' && (
                        <button
                            onClick={() => setShowCancel(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-50 text-red-600 text-sm font-bold hover:bg-red-50 transition-all active:scale-[0.98]"
                        >
                            <XCircle className="h-4 w-4" />
                            Cancelar suscripción
                        </button>
                    )}
                </div>

                {sub?.canceled_at && sub?.status === 'active' && (
                    <p className="text-xs text-slate-500 text-center mt-4">
                        Tu suscripción está programada para cancelarse. Mantienes acceso hasta el {periodEnd}.
                    </p>
                )}
            </motion.div>

            <CancelModal
                isOpen={showCancel}
                onClose={() => setShowCancel(false)}
                periodEnd={sub?.current_period_end || null}
                onCanceled={loadSubscription}
            />
        </>
    )
}
