'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface AppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    appointment?: any // Cita para modo reagendar
}

interface Patient {
    id: string
    nombre: string
}

export default function AppointmentModal({ isOpen, onClose, onSuccess, appointment }: AppointmentModalProps) {
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

    // Cargar datos si estamos en modo reagendar
    useEffect(() => {
        if (appointment && isOpen) {
            setPatientId(appointment.patients?.id || appointment.patient_id || '')

            // CORRECCIÓN: Convertir fecha UTC de DB a local para el input datetime-local
            const date = new Date(appointment.fecha)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')

            setFecha(`${year}-${month}-${day}T${hours}:${minutes}`)
            setMotivo(appointment.motivo || '')
        } else if (!appointment && isOpen) {
            setPatientId('')
            setFecha('')
            setMotivo('')
        }
    }, [appointment, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('Sesión expirada')
                setLoading(false)
                return
            }

            // CORRECCIÓN: Convertir fecha local del input a ISO UTC para la DB
            // const fechaISO = new Date(fecha).toISOString() // This line is no longer needed

            if (appointment?.id) {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({
                        patient_id: patientId,
                        fecha: fecha, // Guardamos el string literal
                        motivo,
                        estado: 'pendiente'
                    })
                    .eq('id', appointment.id)

                if (updateError) throw updateError
                toast.success('Cita reagendada con éxito')
            } else {
                const { error: insertError } = await supabase
                    .from('appointments')
                    .insert([
                        {
                            patient_id: patientId,
                            fecha: fecha, // Guardamos el string literal
                            motivo,
                            doctor_id: user.id,
                            estado: 'pendiente'
                        },
                    ])

                if (insertError) throw insertError
                toast.success('Cita programada con éxito')
            }

            setLoading(false)
            onSuccess() // Recargar lista en la página principal
            onClose()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
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
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-display">
                                    {appointment ? 'Reagendar Cita' : 'Programar Cita'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Sincronización horaria automática activada</p>
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
                                    <Calendar className="h-4 w-4" /> Fecha y Hora Local
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
                                disabled={loading || !patientId || !fecha}
                                className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/10 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Sincronizando...' : (appointment ? 'Confirmar Reagendado' : 'Confirmar Cita')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
