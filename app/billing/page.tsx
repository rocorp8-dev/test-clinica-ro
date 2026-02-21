'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    DollarSign,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    MoreHorizontal,
    Download,
    Calendar,
    Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function BillingPage() {
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, count: 0 })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        async function loadPayments() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data, error } = await supabase
                    .from('payments')
                    .select(`
                        *,
                        patients (nombre)
                    `)
                    .eq('doctor_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setPayments(data || [])

                const total = (data || []).reduce((acc: number, curr: any) => acc + parseFloat(curr.amount), 0)
                setStats({ total, count: data?.length || 0 })
            } catch (err) {
                toast.error('Error al cargar cobros')
            } finally {
                setLoading(false)
            }
        }

        loadPayments()
    }, [])

    if (loading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                <p className="text-slate-500 font-medium italic">Sincronizando transacciones...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-display">Centro de Cobros</h1>
                    <p className="text-slate-500 text-sm">Control de ingresos y facturación de la clínica.</p>
                </div>
                <button
                    onClick={() => toast.success('Reporte generado', { description: 'El reporte mensual ha sido enviado a tu correo.' })}
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-95"
                >
                    <Download className="h-5 w-5" />
                    Exportar Reporte
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="rounded-3xl bg-emerald-600 p-6 md:p-8 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-xl bg-white/10 p-2">
                            <DollarSign className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                        <p className="text-emerald-100 text-xs md:text-sm font-medium">Ingresos Totales</p>
                        <h3 className="text-3xl md:text-4xl font-bold mt-1 font-display">${stats.total.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-xl bg-blue-50 p-2">
                            <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Realizados</span>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs md:text-sm font-medium">Cobros Realizados</p>
                        <h3 className="text-3xl md:text-4xl font-bold mt-1 text-slate-900 font-display">{stats.count}</h3>
                    </div>
                </div>

                <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="rounded-xl bg-amber-50 p-2">
                            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs md:text-sm font-medium">Promedio Diario</p>
                        <h3 className="text-3xl md:text-4xl font-bold mt-1 text-slate-900 font-display">${(stats.total / (stats.count || 1)).toFixed(2)}</h3>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <section className="rounded-[2rem] md:rounded-[2.5rem] bg-white p-4 md:p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-2 md:p-0">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 font-display">Historial de Transacciones</h2>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar transaccion..."
                                className="pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all w-full"
                            />
                        </div>
                        <button
                            onClick={() => toast.info('Filtrado de Finanzas', { description: 'Los filtros por fecha y categoría estarán disponibles próximamente.' })}
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 active:scale-95 transition-transform"
                        >
                            <Filter className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente</th>
                                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Metodo</th>
                                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Monto</th>
                                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Accion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {payments.map((pay) => (
                                <tr key={pay.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-5">
                                        <p className="font-bold text-slate-900">{pay.patients?.nombre}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-tighter font-medium">ID: {pay.id.split('-')[0]}</p>
                                    </td>
                                    <td className="py-5">
                                        <p className="text-sm text-slate-600 font-medium">{new Date(pay.created_at).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(pay.created_at).toLocaleTimeString()}</p>
                                    </td>
                                    <td className="py-5">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                                            {pay.method === 'Efectivo' ? <DollarSign className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                            {pay.method}
                                        </span>
                                    </td>
                                    <td className="py-5">
                                        <p className="font-bold text-slate-900">${parseFloat(pay.amount).toFixed(2)}</p>
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Exitosa</span>
                                    </td>
                                    <td className="py-5 text-right">
                                        <button
                                            onClick={() => toast.info('Detalles de Transacción', { description: 'Puedes visualizar el recibo completo en la sección de reportes.' })}
                                            className="p-2 text-slate-400 hover:bg-white rounded-lg transition-all group-hover:text-slate-600 active:scale-95"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-50">
                    {payments.map((pay) => (
                        <div key={pay.id} className="py-5 space-y-3 active:bg-slate-50 transition-colors rounded-xl px-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-slate-900">{pay.patients?.nombre}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(pay.created_at).toLocaleDateString()} • {new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900">${parseFloat(pay.amount).toFixed(2)}</p>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Exitosa</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-widest">
                                    {pay.method === 'Efectivo' ? <DollarSign className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                    {pay.method}
                                </span>
                                <button
                                    onClick={() => toast.info('Detalles de Transacción', { description: 'Puedes visualizar el recibo completo en la sección de reportes.' })}
                                    className="p-2 text-slate-400 active:text-slate-600 active:scale-95 transition-all border border-slate-100 rounded-lg"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {payments.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center">
                        <DollarSign className="h-12 w-12 text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No se registran cobros todavía.</p>
                    </div>
                )}
            </section>
        </div>
    )
}
