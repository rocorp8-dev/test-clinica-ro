'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Phone, CreditCard, Calendar, Activity, ClipboardList, Send, FileDown, MoreVertical, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface PatientDetailModalProps {
    isOpen: boolean
    onClose: () => void
    patient: any
}

export default function PatientDetailModal({ isOpen, onClose, patient }: PatientDetailModalProps) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [newNote, setNewNote] = useState('')
    const [isWritingNote, setIsWritingNote] = useState(false)

    const fetchHistory = async () => {
        if (!patient?.id) return
        setLoading(true)
        try {
            const [appsRes, notesRes] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', patient.id)
                    .order('fecha', { ascending: false }),
                supabase
                    .from('medical_notes')
                    .select('*')
                    .eq('patient_id', patient.id)
                    .order('created_at', { ascending: false })
            ])

            const combinedHistory = [
                ...(appsRes.data || []).map(a => ({ ...a, type: 'appointment' })),
                ...(notesRes.data || []).map(n => ({ ...n, type: 'note', fecha: n.created_at }))
            ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

            setHistory(combinedHistory)
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && patient?.id) {
            fetchHistory()
        }
    }, [isOpen, patient])

    const handleSaveNote = async () => {
        if (!newNote.trim()) return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No auth')

            const { error } = await supabase
                .from('medical_notes')
                .insert([{
                    patient_id: patient.id,
                    doctor_id: user.id,
                    diagnostico: newNote,
                    receta: ''
                }])

            if (error) throw error

            toast.success('Nota guardada', { description: 'La nota médica ha sido vinculada al expediente.' })
            setNewNote('')
            setIsWritingNote(false)
            fetchHistory()
        } catch (err) {
            toast.error('Error al guardar nota')
        }
    }

    if (!isOpen || !patient) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md p-x-2 md:p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="relative h-24 md:h-32 bg-slate-900 overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20" />
                        <div className="absolute right-4 top-4 md:right-6 md:top-6 z-10 flex gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative px-4 md:px-10 pb-6 md:pb-10 overflow-y-auto pt-4 custom-scrollbar">
                        {/* Profile Info */}
                        <div className="relative -top-8 md:-top-12 flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-6 mb-2 text-center md:text-left">
                            <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-white p-1 shadow-xl">
                                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                                    {patient.nombre.charAt(0)}
                                </div>
                            </div>
                            <div className="pb-0 md:pb-2">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-display">{patient.nombre}</h3>
                                <p className="text-slate-500 font-medium text-xs md:text-sm">Expediente Clínico Digital</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-2 md:mt-0">
                            <div className="space-y-4 md:space-y-6">
                                <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Datos del Paciente</h4>
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <CreditCard className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">DNI / ID</p>
                                            <p className="text-xs md:text-sm font-bold text-slate-900">{patient.dni}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <Phone className="h-5 w-5 text-slate-400" />
                                        <div>
                                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                                            <p className="text-xs md:text-sm font-bold text-slate-900">{patient.telefono}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                        <Activity className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <p className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase">Estado Clínico</p>
                                            <p className="text-xs md:text-sm font-bold text-emerald-700">Auditado por MdPulso</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 md:space-y-6">
                                <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Historial y Notas</h4>
                                <div className="space-y-3">
                                    {loading ? (
                                        <div className="flex justify-center py-6 md:py-10">
                                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((item) => (
                                            <div key={item.id} className={`p-4 rounded-2xl border transition-all shadow-sm ${item.type === 'note' ? 'bg-amber-50/30 border-amber-100' : 'bg-white border-slate-100'
                                                }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${item.type === 'note' ? 'text-amber-600' : 'text-slate-400'
                                                        }`}>
                                                        {item.type === 'note' ? 'Nota Médica' : 'Cita Médica'}
                                                    </p>
                                                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">
                                                        {new Date(item.fecha).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                                                    {item.type === 'note' ? item.diagnostico : item.motivo}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 md:py-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                                            <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-xs text-slate-400">Sin registros previos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 md:mt-10 space-y-4">
                            <AnimatePresence>
                                {isWritingNote && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-3 overflow-hidden"
                                    >
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Escribe alergias, diagnósticos o evoluciones..."
                                            className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                                            rows={3}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setIsWritingNote(false)}
                                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSaveNote}
                                                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-slate-800"
                                            >
                                                <Send className="h-3 w-3" />
                                                Guardar
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!isWritingNote && (
                                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                    <button
                                        onClick={() => setIsWritingNote(true)}
                                        className="flex-1 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ClipboardList className="h-5 w-5" />
                                        Agregar Nota
                                    </button>
                                    <button
                                        onClick={() => toast.info('Generando reporte...', { description: 'El PDF clínico estará listo en unos segundos.' })}
                                        className="rounded-2xl bg-slate-100 px-6 md:px-8 py-4 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileDown className="h-5 w-5" />
                                        PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
