'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    Banknote,
    Smartphone,
    FileText,
    CheckCircle2,
    Calendar,
    User,
    Receipt,
    ArrowUpRight,
    Filter
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const METHOD_ICONS: Record<string, any> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
    transferencia: Smartphone,
    otro: FileText,
}
const METHOD_COLORS: Record<string, string> = {
    efectivo: 'text-emerald-600 bg-emerald-50',
    tarjeta: 'text-blue-600 bg-blue-50',
    transferencia: 'text-violet-600 bg-violet-50',
    otro: 'text-amber-600 bg-amber-50',
}

type TimePeriod = 'today' | 'week' | 'month' | 'all'

export default function BillingPage() {
    const [records, setRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<TimePeriod>('month')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const loadBilling = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            let query = supabase
                .from('billing')
                .select(`
                    id,
                    amount,
                    service_type,
                    payment_method,
                    payment_status,
                    notes,
                    created_at,
                    patients (nombre)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            // Date filter
            const now = new Date()
            if (period === 'today') {
                const start = new Date(now); start.setHours(0, 0, 0, 0)
                query = query.gte('created_at', start.toISOString())
            } else if (period === 'week') {
                const start = new Date(now); start.setDate(now.getDate() - 7)
                query = query.gte('created_at', start.toISOString())
            } else if (period === 'month') {
                const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
                query = query.gte('created_at', start.toISOString())
            }

            const { data, error } = await query
            if (error) throw error
            setRecords(data || [])
        } catch (err) {
            toast.error('Error al cargar cobros')
        } finally {
            setLoading(false)
        }
    }, [period, supabase])

    useEffect(() => { loadBilling() }, [loadBilling])

    // Stats
    const totalRevenue = records.reduce((sum, r) => sum + Number(r.amount), 0)
    const byMethod = records.reduce((acc: Record<string, number>, r) => {
        acc[r.payment_method] = (acc[r.payment_method] || 0) + Number(r.amount)
        return acc
    }, {})
    const byService = records.reduce((acc: Record<string, number>, r) => {
        acc[r.service_type] = (acc[r.service_type] || 0) + 1
        return acc
    }, {})
    const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0]

    const periodLabels: Record<TimePeriod, string> = {
        today: 'Hoy',
        week: 'Últimos 7 días',
        month: 'Este mes',
        all: 'Todo el tiempo',
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-display">Cobros</h1>
                    <p className="text-slate-500 text-xs md:text-sm italic mt-1">Balance financiero de tu práctica médica</p>
                </div>
                {/* Period Filter */}
                <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    {(Object.keys(periodLabels) as TimePeriod[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${period === p
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Total Revenue - Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-1 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-600 p-6 md:p-8 text-white shadow-2xl shadow-emerald-200"
                >
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                    <div className="absolute -left-4 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                                Ingresos · {periodLabels[period]}
                            </p>
                        </div>
                        <p className="text-4xl md:text-5xl font-black tracking-tight font-display">
                            ${totalRevenue.toFixed(2)}
                        </p>
                        <p className="text-emerald-200 text-xs mt-2">
                            {records.length} consulta{records.length !== 1 ? 's' : ''} registrada{records.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </motion.div>

                {/* By Method */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-[2rem] bg-white p-6 md:p-8 shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forma de Pago</p>
                    </div>
                    <div className="space-y-3">
                        {Object.keys(METHOD_ICONS).map(method => {
                            const amount = byMethod[method] || 0
                            if (amount === 0) return null
                            const Icon = METHOD_ICONS[method]
                            const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
                            return (
                                <div key={method} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${METHOD_COLORS[method]}`}>
                                                <Icon className="h-3 w-3" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 capitalize">{method}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">${amount.toFixed(2)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        {Object.keys(byMethod).length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4">Sin cobros en este período</p>
                        )}
                    </div>
                </motion.div>

                {/* Top Service */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-[2rem] bg-white p-6 md:p-8 shadow-sm border border-slate-100"
                >
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-violet-600" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Servicio más frecuente</p>
                    </div>
                    {topService ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                                <p className="text-sm font-black text-violet-900">{topService[0]}</p>
                                <p className="text-xs text-violet-600 mt-1">{topService[1]} consulta{topService[1] !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(byService)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([service, count]) => (
                                        <div key={service} className="flex items-center justify-between">
                                            <span className="text-xs text-slate-600 truncate max-w-[160px]">{service}</span>
                                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{count as number}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>
                    )}
                </motion.div>
            </div>

            {/* Transaction List */}
            <section className="rounded-[2rem] bg-white p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                        Historial de Cobros
                    </h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium">
                        {records.length} registros
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                            <DollarSign className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium text-sm">Sin cobros en este período</p>
                        <p className="text-slate-400 text-xs">Completa una cita confirmada para registrar un cobro</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {records.map((r, i) => {
                            const Icon = METHOD_ICONS[r.payment_method] || FileText
                            return (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-4 p-4 md:p-5 rounded-2xl bg-slate-50/50 border border-transparent hover:bg-white hover:border-slate-100 hover:shadow-md transition-all"
                                >
                                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${METHOD_COLORS[r.payment_method]}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <User className="h-3 w-3" />
                                                <span className="truncate max-w-[120px] md:max-w-none">{(r.patients as any)?.nombre || 'Paciente'}</span>
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 truncate">{r.service_type}</p>
                                        {r.notes && (
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.notes}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-lg font-black text-emerald-700">+${Number(r.amount).toFixed(2)}</p>
                                        <div className="flex items-center gap-1 justify-end mt-0.5">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 hidden sm:flex">
                                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase tracking-wider">Pagado</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}
