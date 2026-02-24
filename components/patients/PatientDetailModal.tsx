'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Phone, CreditCard, Calendar, Activity, ClipboardList, Send, FileDown, MoreVertical, Loader2, Brain, AlertTriangle, TrendingUp, Lightbulb, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface PatientDetailModalProps {
    isOpen: boolean
    onClose: () => void
    patient: any
}

interface ClinicalSnapshot {
    safetyAlerts: {
        hasAlerts: boolean
        notes: string
    }
    snapshot: {
        reason: string
        diagnosis: string
        status: string
    }
    trends: string
    suggestion: string
}

export default function PatientDetailModal({ isOpen, onClose, patient }: PatientDetailModalProps) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [newNote, setNewNote] = useState('')
    const [isWritingNote, setIsWritingNote] = useState(false)

    // NIA Snapshot States
    const [snapshot, setSnapshot] = useState<ClinicalSnapshot | null>(null)
    const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false)

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
            setSnapshot(null)
            fetchHistory()
        }
    }, [isOpen, patient])

    const handleGenerateSnapshot = async () => {
        if (!patient?.id) return
        setIsGeneratingSnapshot(true)
        setSnapshot(null)

        try {
            const res = await fetch('/api/nia/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patient.id })
            })

            if (!res.ok) {
                // Try to extract error message from response
                let errorMsg = 'Error al generar snapshot';
                try {
                    const errData = await res.json();
                    if (errData?.error) {
                        errorMsg = typeof errData.error === 'string'
                            ? errData.error
                            : (errData.error.message || JSON.stringify(errData.error));
                    } else if (errData?.message) {
                        errorMsg = typeof errData.message === 'string'
                            ? errData.message
                            : JSON.stringify(errData.message);
                    } else if (typeof errData === 'object' && errData !== null) {
                        errorMsg = JSON.stringify(errData);
                    }
                } catch (_) {
                    // ignore parsing errors
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            setSnapshot(data);
            toast.success('Snapshot clínico generado con éxito', {
                icon: '🧠'
            })
        } catch (err) {
            console.error(err)
            const message = err instanceof Error ? err.message : String(err)
            toast.error(`No se pudo generar el Snapshot Clínico: ${message}`)
        } finally {
            setIsGeneratingSnapshot(false)
        }
    }

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
                    {/* Header Banner - Now more subtle and professional */}
                    <div className="relative h-28 md:h-32 bg-slate-50 overflow-hidden flex-shrink-0 border-b border-slate-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50/30" />
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                        <div className="absolute right-4 top-4 md:right-6 md:top-6 z-10 flex gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-full bg-slate-200/50 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-90"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Integrated Profile Info */}
                        <div className="absolute bottom-0 left-0 w-full px-6 md:px-10 pb-4 md:pb-6 flex items-end gap-4 md:gap-6">
                            <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-[2rem] bg-white p-1.5 shadow-2xl shadow-emerald-900/10 border border-slate-100 flex-shrink-0">
                                <div className="h-full w-full rounded-[1.6rem] bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl md:text-4xl font-black font-display shadow-inner">
                                    {patient.nombre.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                                    <div className="h-full w-full rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Activity className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 pb-1 md:pb-2">
                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display tracking-tight leading-none mb-1 md:mb-2">{patient.nombre}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Paciente Activo</span>
                                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">ID: {patient.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="relative px-6 md:px-10 py-6 md:py-8 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
                            {/* Personal Data Column */}
                            <div className="md:col-span-4 space-y-6 md:space-y-8">
                                <div>
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                        <div className="h-1 w-4 bg-emerald-400 rounded-full" />
                                        Ficha Clínica
                                    </h4>

                                    <div className="space-y-4">
                                        <div className="group flex flex-col gap-1 p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <CreditCard className="h-3 w-3" />
                                                Identificación
                                            </p>
                                            <p className="text-sm font-bold text-slate-800 font-mono tracking-wider">{patient.dni}</p>
                                        </div>

                                        <div className="group flex flex-col gap-1 p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Phone className="h-3 w-3" />
                                                Línea Móvil
                                            </p>
                                            <p className="text-sm font-bold text-slate-800">{patient.telefono}</p>
                                        </div>

                                        <div className="flex flex-col gap-3 p-5 rounded-3xl bg-emerald-50/50 border border-emerald-100/50">
                                            <div className="flex items-center justify-between">
                                                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                    <Activity className="h-4 w-4 text-emerald-600" />
                                                </div>
                                                <span className="text-[9px] font-black text-emerald-600 uppercase bg-white px-2 py-0.5 rounded-full shadow-sm">Auditado</span>
                                            </div>
                                            <p className="text-[10px] font-medium text-emerald-800 leading-snug">
                                                Expediente verificado y auditado bajo estándares MdPulso.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical History Column */}
                            <div className="md:col-span-8 space-y-6">
                                {/* NIA MAGIC BUTTON & SNAPSHOT DASHBOARD */}
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                            <Brain className="h-4 w-4" />
                                            Asistencia Inteligente
                                        </h4>
                                        {!snapshot && !isGeneratingSnapshot && (
                                            <button
                                                onClick={handleGenerateSnapshot}
                                                className="group flex flex-col md:flex-row items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all"
                                            >
                                                <Sparkles className="h-3 w-3 text-white group-hover:rotate-12 transition-transform" />
                                                Generar Snapshot Clínico
                                            </button>
                                        )}
                                    </div>

                                    {isGeneratingSnapshot && (
                                        <div className="flex flex-col items-center justify-center py-10 rounded-3xl border border-emerald-100 bg-emerald-50/30">
                                            <div className="relative h-12 w-12 mb-4">
                                                <div className="absolute inset-0 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                <Brain className="absolute inset-0 m-auto h-5 w-5 text-emerald-500 animate-pulse" />
                                            </div>
                                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest animate-pulse">Analizando Historial Médico...</p>
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {snapshot && !isGeneratingSnapshot && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            >
                                                {/* 1. Alertas de Seguridad */}
                                                <div className={`md:col-span-2 rounded-2xl p-5 border ${snapshot!.safetyAlerts.hasAlerts ? 'bg-rose-50 border-rose-200 shadow-sm shadow-rose-100' : 'bg-green-50/50 border-green-100'}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {snapshot!.safetyAlerts.hasAlerts ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : <Activity className="h-4 w-4 text-green-500" />}
                                                        <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] ${snapshot!.safetyAlerts.hasAlerts ? 'text-rose-600' : 'text-green-600'}`}>
                                                            Alertas de Seguridad
                                                        </h5>
                                                    </div>
                                                    <p className={`text-sm font-bold ${snapshot!.safetyAlerts.hasAlerts ? 'text-rose-700' : 'text-green-700'}`}>
                                                        {snapshot!.safetyAlerts.notes}
                                                    </p>
                                                </div>

                                                {/* 2. Snapshot Clínico */}
                                                <div className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Activity className="h-4 w-4 text-sky-500" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado Actual</h5>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Motivo</p>
                                                            <p className="text-xs font-bold text-slate-700">{snapshot!.snapshot.reason}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Diagnóstico</p>
                                                            <p className="text-xs font-bold text-slate-700">{snapshot!.snapshot.diagnosis}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Estado General</p>
                                                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                                {snapshot!.snapshot.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Trends & Patterns */}
                                                <div className="rounded-2xl p-5 bg-slate-50 border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tendencias Históricas</h5>
                                                    </div>
                                                    <p className="text-xs font-medium leading-relaxed text-slate-600">
                                                        {snapshot!.trends}
                                                    </p>
                                                </div>

                                                {/* 4. Sugerencia Operativa */}
                                                <div className="md:col-span-2 rounded-2xl p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Lightbulb className="h-4 w-4 text-emerald-100" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Próximo Paso Sugerido</h5>
                                                    </div>
                                                    <p className="text-sm font-bold leading-relaxed">
                                                        {snapshot!.suggestion}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <div className="h-4 w-1 bg-slate-200 rounded-full" />
                                        Timeline Clínico
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{history.length} Eventos</span>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sincronizando Historial...</p>
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((item, idx) => (
                                            <div key={item.id} className="relative pl-6 pb-2 last:pb-0">
                                                {/* Timeline Line */}
                                                {idx !== history.length - 1 && (
                                                    <div className="absolute left-[3px] top-[14px] bottom-[-14px] w-[1px] bg-slate-100" />
                                                )}
                                                {/* Timeline Dot */}
                                                <div className={`absolute left-0 top-[6px] h-2 w-2 rounded-full ring-4 ring-white shadow-sm ${item.type === 'note' ? 'bg-amber-400' : 'bg-blue-400'
                                                    }`} />

                                                <div className="p-4 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item.type === 'note'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {item.type === 'note' ? 'Evolución' : 'Consulta'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold">
                                                                {new Date(item.fecha).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <button className="text-slate-300 hover:text-slate-500">
                                                            <MoreVertical className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                                        "{item.type === 'note' ? item.diagnostico : item.motivo}"
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-16 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-100">
                                            <div className="h-16 w-16 rounded-full bg-white shadow-sm mx-auto mb-4 flex items-center justify-center">
                                                <ClipboardList className="h-6 w-6 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400">Sin historial registrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="mt-12 space-y-4">
                            <AnimatePresence>
                                {isWritingNote && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="space-y-4 bg-slate-900 p-6 rounded-[2rem] shadow-2xl"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                                                <ClipboardList className="h-4 w-4 text-white" />
                                            </div>
                                            <p className="text-sm font-black text-white uppercase tracking-widest">Nueva Nota de Evolución</p>
                                        </div>
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Describa el diagnóstico, tratamiento o hallazgos clínicos..."
                                            className="w-full rounded-2xl bg-white/10 border border-white/20 p-5 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium placeholder:text-slate-500"
                                            rows={4}
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setIsWritingNote(false)}
                                                className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                                            >
                                                Descartar
                                            </button>
                                            <button
                                                onClick={handleSaveNote}
                                                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all"
                                            >
                                                <Send className="h-3 w-3" />
                                                Confirmar Nota
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!isWritingNote && (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => setIsWritingNote(true)}
                                        className="flex-[2] rounded-[1.5rem] bg-emerald-600 py-5 text-sm font-black text-white shadow-2xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-90 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                                    >
                                        <ClipboardList className="h-5 w-5" />
                                        Agregar Evolución
                                    </button>
                                    <button
                                        onClick={() => toast.info('Generando reporte...', { description: 'El PDF clínico estará listo en unos segundos.' })}
                                        className="flex-1 rounded-[1.5rem] bg-slate-900 py-5 text-sm font-black text-white shadow-2xl shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                    >
                                        <FileDown className="h-5 w-5" />
                                        Exportar
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
