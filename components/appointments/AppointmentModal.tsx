'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft, Sparkles, ChevronRight, Check } from 'lucide-react'
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
    const [fecha, setFecha] = useState('')
    const [motivo, setMotivo] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [patients, setPatients] = useState<Patient[]>([])

    // Estados para el selector premium
    const [view, setView] = useState<'form' | 'date-picker'>('form')

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

            if (appointment?.id) {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({
                        patient_id: patientId,
                        fecha: fecha,
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
                            fecha: fecha,
                            motivo,
                            doctor_id: user.id,
                            estado: 'pendiente'
                        },
                    ])

                if (insertError) throw insertError
                toast.success('Cita programada')
            }

            setLoading(false)
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const formatReadableDate = (dateStr: string) => {
        if (!dateStr) return 'Seleccionar fecha y hora'
        const d = new Date(dateStr)
        return d.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleDateClick = () => {
        const input = document.getElementById('premium-date-input') as HTMLInputElement;
        if (input) {
            try {
                // @ts-ignore - showPicker is modern API
                if (input.showPicker) input.showPicker();
                else input.focus();
            } catch (e) {
                input.focus();
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-lg rounded-t-[3rem] md:rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                    >
                        {/* Premium Header Banner */}
                        <div className="relative h-28 bg-slate-50 overflow-hidden flex-shrink-0 border-b border-slate-100">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50/20" />

                            <div className="relative h-full px-8 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
                                        {appointment ? 'Reagendar' : 'Programar Cita'}
                                    </h3>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 pb-1">
                                        MdPulso Inteligente
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2.5 text-slate-400 hover:bg-white hover:text-slate-900 transition-all border border-slate-100 bg-white/50 backdrop-blur-sm"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                            {/* Patient Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <User className="h-3 w-3 text-emerald-500" /> Paciente
                                </label>
                                <div className="relative group">
                                    <select
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        className="w-full appearance-none rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-xl shadow-sm border border-slate-100 pointer-events-none group-focus-within:rotate-180 transition-transform">
                                        <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                                    </div>
                                </div>
                            </div>

                            {/* Date Selection Card - REDESIGNED */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-emerald-500" /> Horario de Atención
                                </label>
                                <div className="relative">
                                    {/* El input real está oculto pero funcional para que el buscador nativo se active al tocar el contenedor */}
                                    <div
                                        onClick={handleDateClick}
                                        className="group relative w-full rounded-[1.5rem] border-2 border-emerald-50 bg-emerald-50/20 px-6 py-5 flex items-center gap-4 hover:border-emerald-500/30 transition-all cursor-pointer"
                                    >
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                                            <Clock className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mb-0.5 opacity-60">Toque para seleccionar</p>
                                            <p className="text-sm md:text-base font-black text-slate-900 truncate capitalize">
                                                {fecha ? formatReadableDate(fecha) : 'Click para configurar'}
                                            </p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Check className="h-4 w-4" />
                                        </div>

                                        {/* Input nativo oculto pero ocupando todo el card */}
                                        <input
                                            id="premium-date-input"
                                            type="datetime-local"
                                            value={fecha}
                                            onChange={(e) => setFecha(e.target.value)}
                                            className="absolute invisible"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Motivo Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <AlignLeft className="h-3 w-3 text-emerald-500" /> Motivo Médico
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        className="w-full rounded-[1.5rem] border-2 border-slate-50 bg-slate-50 px-6 py-5 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none min-h-[100px] resize-none leading-relaxed placeholder:text-slate-300"
                                        placeholder="Describa el motivo de la consulta..."
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3"
                                >
                                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                    <p className="text-xs font-bold text-rose-600">{error}</p>
                                </motion.div>
                            )}

                            {/* Action Area */}
                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !patientId || !fecha}
                                    className="w-full group relative rounded-[1.5rem] bg-slate-900 py-5 text-sm font-black text-white shadow-2xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                                            {appointment ? 'Reconfirmar Cita' : 'Agendar Ahora'}
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
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

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
