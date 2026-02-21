'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft, Sparkles, ChevronRight, Check, History, Timer } from 'lucide-react'
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

    const handleDateClick = () => {
        const input = document.getElementById('premium-date-input') as HTMLInputElement;
        if (input) {
            try {
                // @ts-ignore
                if (input.showPicker) input.showPicker();
                else input.focus();
            } catch (e) {
                input.focus();
            }
        }
    };

    // Helper para extraer datos visuales de la fecha
    const getDateInfo = (dateStr: string) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return {
            dayName: d.toLocaleDateString('es-ES', { weekday: 'long' }),
            dayNumber: d.getDate(),
            monthName: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
            year: d.getFullYear(),
            time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    const dateInfo = getDateInfo(fecha);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-xl rounded-t-[3rem] md:rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200"
                    >
                        {/* Premium Header Banner */}
                        <div className="relative h-24 bg-slate-50 overflow-hidden flex-shrink-0 border-b border-slate-100/60">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50/20" />

                            <div className="relative h-full px-8 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/60">Planificador de Turnos</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display tracking-tighter leading-none">
                                        {appointment ? 'Reagendar Cita' : 'Programar Nueva Cita'}
                                    </h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2.5 text-slate-400 hover:bg-white hover:text-slate-900 transition-all border border-slate-100 bg-white shadow-sm"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
                            {/* Visual Date Dashboard */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-emerald-500" /> Configuración Esencial
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Date Visual Plate */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={handleDateClick}
                                        className="relative overflow-hidden group cursor-pointer rounded-3xl border-2 border-slate-50 bg-slate-50/30 p-5 transition-all hover:border-emerald-500/20 hover:bg-white flex items-center gap-5"
                                    >
                                        <div className="flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-white border border-slate-100 text-slate-900 shadow-sm">
                                            {dateInfo ? (
                                                <>
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 leading-none mb-1">{dateInfo.monthName}</span>
                                                    <span className="text-2xl font-black leading-none">{dateInfo.dayNumber}</span>
                                                </>
                                            ) : (
                                                <Calendar className="h-6 w-6 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Fecha del Encuentro</p>
                                            <p className="text-sm font-black text-slate-900 capitalize">
                                                {dateInfo ? dateInfo.dayName : 'Seleccionar Día'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">{dateInfo ? dateInfo.year : 'Calendario 2026'}</p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </motion.div>

                                    {/* Time Visual Plate */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={handleDateClick}
                                        className="relative overflow-hidden group cursor-pointer rounded-3xl border-2 border-slate-50 bg-slate-50/30 p-5 transition-all hover:border-emerald-500/20 hover:bg-white flex items-center gap-5"
                                    >
                                        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white border border-slate-100 text-emerald-600 shadow-sm">
                                            <Clock className="h-7 w-7" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Hora Establecida</p>
                                            <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">
                                                {dateInfo ? dateInfo.time : '-- : --'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">Duración: 45 min</p>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors">
                                            <Timer className="h-4 w-4" />
                                        </div>

                                        {/* El input real escondido */}
                                        <input
                                            id="premium-date-input"
                                            type="datetime-local"
                                            value={fecha}
                                            onChange={(e) => setFecha(e.target.value)}
                                            className="absolute invisible"
                                            required
                                        />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Patient Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <User className="h-3 w-3 text-emerald-500" /> Datos del Paciente
                                </label>
                                <div className="relative group">
                                    <select
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        className="w-full appearance-none rounded-[1.8rem] border-2 border-slate-50 bg-slate-50/50 px-7 py-5 text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none"
                                        required
                                    >
                                        <option value="">Buscar en el registro...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-white rounded-2xl shadow-sm border border-slate-100 pointer-events-none group-focus-within:rotate-180 transition-transform">
                                        <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                                    </div>
                                </div>
                            </div>

                            {/* Motivo Card */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <AlignLeft className="h-3 w-3 text-emerald-500" /> Detalles Médicos
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        className="w-full rounded-[1.8rem] border-2 border-slate-50 bg-slate-50/50 px-7 py-5 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-500/30 transition-all outline-none min-h-[100px] resize-none leading-relaxed placeholder:text-slate-300"
                                        placeholder="Motivo de consulta, síntomas o notas preventivas..."
                                    />
                                    <div className="absolute right-6 bottom-6 opacity-10">
                                        <History className="h-8 w-8 text-slate-900" />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 rounded-[1.5rem] bg-rose-50 border border-rose-100 flex items-center gap-4 shadow-sm"
                                >
                                    <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                                    <p className="text-xs font-black text-rose-600">{error}</p>
                                </motion.div>
                            )}

                            {/* Premium Footer Buttons */}
                            <div className="pt-2 flex flex-col gap-4">
                                <button
                                    type="submit"
                                    disabled={loading || !patientId || !fecha}
                                    className="w-full group relative rounded-[2rem] bg-slate-900 py-6 text-sm font-black text-white shadow-2xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-4 uppercase tracking-[0.2em]"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                                <Check className="h-4 w-4" />
                                            </div>
                                            {appointment ? 'Reconfirmar Agenda' : 'Establecer Turno'}
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors tracking-[0.3em]"
                                >
                                    Cancelar Operación
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
