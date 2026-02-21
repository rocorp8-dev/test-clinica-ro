'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft, Sparkles, ChevronRight, Check, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface AppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    appointment?: any
}

interface Patient {
    id: string
    nombre: string
}

export default function AppointmentModal({ isOpen, onClose, onSuccess, appointment }: AppointmentModalProps) {
    const [patientId, setPatientId] = useState('')
    const [fechaVal, setFechaVal] = useState('') // YYYY-MM-DD
    const [horaVal, setHoraVal] = useState('') // HH:mm
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

    useEffect(() => {
        if (appointment && isOpen) {
            setPatientId(appointment.patients?.id || appointment.patient_id || '')
            const date = new Date(appointment.fecha)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')

            setFechaVal(`${year}-${month}-${day}`)
            setHoraVal(`${hours}:${minutes}`)
            setMotivo(appointment.motivo || '')
        } else if (!appointment && isOpen) {
            setPatientId('')
            setFechaVal('')
            setHoraVal('')
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

            // Unimos fecha y hora para la DB
            const fullFecha = `${fechaVal}T${horaVal}`

            if (appointment?.id) {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({
                        patient_id: patientId,
                        fecha: fullFecha,
                        motivo,
                        estado: 'pendiente'
                    })
                    .eq('id', appointment.id)

                if (updateError) throw updateError
                toast.success('Cita actualizada correctamente')
            } else {
                const { error: insertError } = await supabase
                    .from('appointments')
                    .insert([
                        {
                            patient_id: patientId,
                            fecha: fullFecha,
                            motivo,
                            doctor_id: user.id,
                            estado: 'pendiente'
                        },
                    ])

                if (insertError) throw insertError
                toast.success('Cita agendada con éxito')
            }

            setLoading(false)
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 backdrop-blur-md p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                    >
                        {/* Header Sophistication */}
                        <div className="p-8 pb-4 bg-gradient-to-br from-white to-slate-50/50 flex items-center justify-between border-b border-slate-100/60">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight leading-none">
                                    {appointment ? 'Reagendar Cita' : 'Programar Turno'}
                                </h3>
                                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600 mt-2">MdPulso Clínico</p>
                            </div>
                            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-7 overflow-y-auto max-h-[75vh]">
                            {/* Patient Section */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <User className="h-3 w-3 text-emerald-500" /> Paciente Registrado
                                </label>
                                <div className="relative group">
                                    <select
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500/20 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar del registro...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            {/* Unified Date/Time Card - FLUID DESIGN */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <CalendarDays className="h-3 w-3 text-emerald-500" /> Horario del Encuentro
                                </label>
                                <div className="rounded-[2rem] border-2 border-emerald-50 bg-emerald-50/20 p-2 flex flex-col md:flex-row gap-2">
                                    {/* Date Selector */}
                                    <div className="flex-1 relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Calendar className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <input
                                            type="date"
                                            value={fechaVal}
                                            onChange={(e) => setFechaVal(e.target.value)}
                                            className="w-full rounded-2xl border-none bg-white pl-14 pr-6 py-4 text-sm font-black text-slate-900 focus:ring-0 transition-all outline-none cursor-pointer"
                                            required
                                        />
                                    </div>
                                    {/* Time Selector - MUCH MORE FLUID separately */}
                                    <div className="w-full md:w-44 relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Clock className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <input
                                            type="time"
                                            value={horaVal}
                                            onChange={(e) => setHoraVal(e.target.value)}
                                            className="w-full rounded-2xl border-none bg-white pl-14 pr-6 py-4 text-sm font-black text-slate-900 focus:ring-0 transition-all outline-none cursor-pointer"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Motivo Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <AlignLeft className="h-3 w-3 text-emerald-500" /> Detalles de Consulta
                                </label>
                                <textarea
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-5 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-500/20 transition-all outline-none min-h-[100px] resize-none leading-relaxed"
                                    placeholder="Motivo o síntomas..."
                                />
                            </div>

                            {error && <p className="text-xs font-bold text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100">{error}</p>}

                            {/* Premium Footer */}
                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !patientId || !fechaVal || !horaVal}
                                    className="w-full group rounded-[1.8rem] bg-slate-900 py-5 text-sm font-black text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-30 tracking-[0.2em] flex items-center justify-center gap-3"
                                >
                                    {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                        <>
                                            <Sparkles className="h-4 w-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                                            {appointment ? 'CONFIRMAR CAMBIOS' : 'ESTABLECER TURNO'}
                                        </>
                                    )}
                                </button>
                                <button onClick={onClose} type="button" className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Cerrar Ventana
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
