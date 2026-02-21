'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'

interface AppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface Patient {
    id: string
    nombre: string
}

import { motion, AnimatePresence } from 'framer-motion'

export default function AppointmentModal({ isOpen, onClose, onSuccess }: AppointmentModalProps) {
    const [patientId, setPatientId] = useState('')
    const [fecha, setFecha] = useState('')
    const [motivo, setMotivo] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [patients, setPatients] = useState<Patient[]>([])

    useEffect(() => {
        const fetchPatients = async () => {
            const { data } = await supabase.from('patients').select('id, nombre').order('nombre')
            setPatients(data || [])
        }
        if (isOpen) fetchPatients()
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Debes estar autenticado para agendar citas')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('appointments')
            .insert([
                {
                    patient_id: patientId,
                    fecha,
                    motivo,
                    doctor_id: user.id,
                    estado: 'pendiente'
                },
            ])

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            setPatientId('')
            setFecha('')
            setMotivo('')
            setLoading(false)
            toast.success('Cita programada con éxito')
            onSuccess()
            onClose()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md p-x-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-md rounded-t-[2.5rem] md:rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-display">Programar Cita</h3>
                                <p className="text-xs text-slate-400 mt-1">Configura los detalles del encuentro</p>
                            </div>
                            <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 transition-colors border border-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="h-4 w-4" /> Paciente
                                </label>
                                <select
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium"
                                    required
                                >
                                    <option value="">Selecciona un paciente...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Fecha y Hora
                                </label>
                                <input
                                    type="datetime-local"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlignLeft className="h-4 w-4" /> Motivo
                                </label>
                                <textarea
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium"
                                    placeholder="Ej. Chequeo general..."
                                    rows={3}
                                />
                            </div>

                            {error && <p className="text-xs font-medium text-red-500 bg-red-50/50 p-3 rounded-xl border border-red-100">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading || !patientId}
                                className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/10 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Agendando...' : 'Confirmar Cita'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
