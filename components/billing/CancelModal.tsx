'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Loader2, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

const CANCEL_REASONS = [
    { value: 'precio', label: 'El precio es muy alto' },
    { value: 'poco_uso', label: 'No lo estoy usando lo suficiente' },
    { value: 'funciones', label: 'Me faltan funciones importantes' },
    { value: 'tecnicos', label: 'Problemas técnicos' },
    { value: 'otro', label: 'Otra razón' },
]

interface CancelModalProps {
    isOpen: boolean
    onClose: () => void
    periodEnd: string | null
    onCanceled: () => void
}

export default function CancelModal({ isOpen, onClose, periodEnd, onCanceled }: CancelModalProps) {
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const formattedEnd = periodEnd
        ? new Date(periodEnd).toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: '2-digit', month: 'long', year: 'numeric',
        })
        : null

    const handleCancel = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/billing/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'No se pudo cancelar')

            toast.success('Suscripción cancelada', {
                description: formattedEnd
                    ? `Puedes seguir usando MdPulso hasta el ${formattedEnd}.`
                    : 'Mantienes acceso hasta el final del periodo pagado.',
            })
            onCanceled()
            onClose()
        } catch (err) {
            toast.error('Error al cancelar', {
                description: err instanceof Error ? err.message : 'Intenta de nuevo',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-7 w-7 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 font-display">¿Seguro que deseas cancelar?</h3>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                Al cancelar tu suscripción perderás acceso a:
                            </p>
                        </div>

                        <ul className="space-y-2 mb-6">
                            {[
                                'Expedientes clínicos NOM-004 y auditoría NOM-024',
                                'Agenda médica y recordatorios de citas',
                                'Copiloto NIA (IA clínica) y alertas de seguridad',
                                'Historial de pacientes y curvas de crecimiento',
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block ml-1">
                                ¿Por qué cancelas? (opcional)
                            </label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            >
                                <option value="">Selecciona una razón...</option>
                                {CANCEL_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {formattedEnd && (
                            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mb-6">
                                <CalendarClock className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-800 leading-relaxed">
                                    Puedes seguir usando MdPulso hasta <span className="font-bold">{formattedEnd}</span>. Tus datos permanecen seguros y puedes reactivar cuando quieras.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Cancelando...
                                    </>
                                ) : (
                                    'Confirmar cancelación'
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                            >
                                Mantener mi plan
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
