'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, CreditCard, Banknote, Smartphone, FileText, CheckCircle2, Sparkles } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    appointment: {
        id: string
        patient_id: string
        patients?: { nombre: string }
        motivo?: string
    } | null
}

const SERVICE_TYPES = [
    'Consulta General',
    'Consulta de Seguimiento',
    'Consulta de Urgencia',
    'Revisión de Resultados',
    'Procedimiento Menor',
    'Revisión Pediátrica',
    'Control Crónico',
    'Revisión Prenatal',
    'Certificado Médico',
    'Otro',
]

const PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'emerald' },
    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
    { id: 'transferencia', label: 'Transferencia', icon: Smartphone, color: 'violet' },
    { id: 'otro', label: 'Otro / Seguro', icon: FileText, color: 'amber' },
]

export default function CheckoutModal({ isOpen, onClose, onSuccess, appointment }: CheckoutModalProps) {
    const [amount, setAmount] = useState('')
    const [serviceType, setServiceType] = useState('Consulta General')
    const [paymentMethod, setPaymentMethod] = useState('efectivo')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!appointment || !amount || parseFloat(amount) <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autorizado')

            // 1. Insert billing record
            const { error: billingError } = await supabase.from('billing').insert([{
                user_id: user.id,
                appointment_id: appointment.id,
                patient_id: appointment.patient_id,
                amount: parseFloat(amount),
                service_type: serviceType,
                payment_method: paymentMethod,
                payment_status: 'pagado',
                notes: notes.trim() || null,
            }])
            if (billingError) throw billingError

            // 2. Mark appointment as 'completada'
            const { error: appError } = await supabase
                .from('appointments')
                .update({ estado: 'completada' })
                .eq('id', appointment.id)
            if (appError) throw appError

            toast.success('✅ Cobro registrado', {
                description: `$${parseFloat(amount).toFixed(2)} registrado correctamente.`
            })
            onSuccess()
            onClose()
            // Reset form
            setAmount('')
            setServiceType('Consulta General')
            setPaymentMethod('efectivo')
            setNotes('')
        } catch (err: any) {
            toast.error('Error al registrar cobro', { description: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && appointment && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                    >
                        {/* Header */}
                        <div className="p-7 pb-4 bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-5 w-5 text-emerald-200" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200">Registro de Cobro</p>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight leading-none font-display">
                                    {appointment.patients?.nombre || 'Paciente'}
                                </h3>
                                {appointment.motivo && (
                                    <p className="text-emerald-100 text-xs mt-1 opacity-80 truncate max-w-[280px]">{appointment.motivo}</p>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-7 space-y-6 overflow-y-auto max-h-[75vh]">
                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="h-3 w-3 text-emerald-500" /> Monto a Cobrar
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-6 py-5 text-3xl font-black text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Service Type */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="h-3 w-3 text-emerald-500" /> Tipo de Servicio
                                </label>
                                <div className="relative">
                                    <select
                                        value={serviceType}
                                        onChange={e => setServiceType(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none"
                                    >
                                        {SERVICE_TYPES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard className="h-3 w-3 text-emerald-500" /> Forma de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {PAYMENT_METHODS.map(pm => {
                                        const Icon = pm.icon
                                        const isSelected = paymentMethod === pm.id
                                        return (
                                            <button
                                                key={pm.id}
                                                type="button"
                                                onClick={() => setPaymentMethod(pm.id)}
                                                className={`relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${isSelected
                                                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                                                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                                }`}
                                            >
                                                <div className={`rounded-xl p-2 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                    {pm.label}
                                                </span>
                                                {isSelected && (
                                                    <CheckCircle2 className="absolute top-3 right-3 h-3.5 w-3.5 text-emerald-500" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Notes (optional) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas (opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-700 focus:bg-white focus:border-emerald-500/30 transition-all outline-none min-h-[80px] resize-none"
                                    placeholder="Descuento aplicado, seguro médico, etc."
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !amount}
                                    className="w-full group rounded-[1.8rem] bg-gradient-to-r from-emerald-600 to-teal-600 py-5 text-sm font-black text-white shadow-xl shadow-emerald-200 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 tracking-[0.1em] flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                                            REGISTRAR COBRO Y COMPLETAR CITA
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClose}
                                    type="button"
                                    className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
