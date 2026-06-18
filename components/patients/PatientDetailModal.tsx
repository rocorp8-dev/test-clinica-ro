'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    X, User, Phone, CreditCard, Calendar, Activity, ClipboardList, Send,
    FileDown, MoreVertical, Loader2, Brain, AlertTriangle, TrendingUp,
    Lightbulb, Sparkles, Mail, MapPin, Heart, Droplet, Shield, Stethoscope,
    ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import GrowthTab from '@/components/growth/GrowthTab'

interface PatientDetailModalProps {
    isOpen: boolean
    onClose: () => void
    patient: any
}

interface ClinicalSnapshot {
    safetyAlerts: { hasAlerts: boolean; notes: string }
    snapshot: { reason: string; diagnosis: string; status: string }
    trends: string
    suggestion: string
}

const SOAP_INITIAL = { tipo_nota: 'evolucion', subjetivo: '', objetivo: '', analisis: '', plan: '' }

const TIPO_NOTA_LABELS: Record<string, string> = {
    primera_vez: 'Primera Vez',
    evolucion: 'Evolución',
    urgencias: 'Urgencias',
    referencia: 'Referencia',
    interconsulta: 'Interconsulta',
    egreso: 'Egreso',
    enfermeria: 'Enfermería',
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
    if (!value) return null
    return (
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white border border-slate-100 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {label}
            </p>
            <p className="text-sm font-bold text-slate-800">{value}</p>
        </div>
    )
}

export default function PatientDetailModal({ isOpen, onClose, patient }: PatientDetailModalProps) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isWritingNote, setIsWritingNote] = useState(false)
    const [soap, setSoap] = useState(SOAP_INITIAL)
    const [showFullFicha, setShowFullFicha] = useState(false)
    const [activeTab, setActiveTab] = useState<'historial' | 'crecimiento'>('historial')

    const [snapshot, setSnapshot] = useState<ClinicalSnapshot | null>(null)
    const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false)

    const fetchHistory = async () => {
        if (!patient?.id) return
        setLoading(true)
        try {
            const [appsRes, notesRes] = await Promise.all([
                supabase.from('appointments').select('*').eq('patient_id', patient.id).order('fecha', { ascending: false }),
                supabase.from('medical_notes').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false })
            ])
            const combined = [
                ...(appsRes.data || []).map(a => ({ ...a, _type: 'appointment' })),
                ...(notesRes.data || []).map(n => ({ ...n, _type: 'note', fecha: n.created_at }))
            ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            setHistory(combined)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && patient?.id) {
            setSnapshot(null)
            setSoap(SOAP_INITIAL)
            setIsWritingNote(false)
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
                let msg = 'Error al generar snapshot'
                try { const d = await res.json(); msg = d?.error || d?.message || msg } catch (_) {}
                throw new Error(msg)
            }
            setSnapshot(await res.json())
            toast.success('Snapshot clínico generado', { icon: '🧠' })
        } catch (err) {
            toast.error(`No se pudo generar el Snapshot: ${err instanceof Error ? err.message : err}`)
        } finally {
            setIsGeneratingSnapshot(false)
        }
    }

    const handleSaveNote = async () => {
        if (!soap.subjetivo.trim() && !soap.analisis.trim()) {
            toast.error('Agrega al menos el motivo (S) o diagnóstico (A)')
            return
        }
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No auth')
            const { error } = await supabase.from('medical_notes').insert([{
                patient_id: patient.id,
                doctor_id: user.id,
                tipo_nota: soap.tipo_nota,
                subjetivo: soap.subjetivo || null,
                objetivo: soap.objetivo || null,
                analisis: soap.analisis || null,
                plan: soap.plan || null,
                diagnostico: soap.analisis || null,
            }])
            if (error) throw error
            toast.success('Nota guardada — NOM-004 ✓')
            setSoap(SOAP_INITIAL)
            setIsWritingNote(false)
            fetchHistory()
        } catch (err) {
            toast.error('Error al guardar nota')
        }
    }

    const calcAge = (fecha_nac?: string) => {
        if (!fecha_nac) return null
        const diff = Date.now() - new Date(fecha_nac).getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' años'
    }

    const SEXO_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', otro: 'Otro' }
    const EC_LABEL: Record<string, string> = { soltero: 'Soltero/a', casado: 'Casado/a', divorciado: 'Divorciado/a', viudo: 'Viudo/a', union_libre: 'Unión libre', otro: 'Otro' }

    if (!isOpen || !patient) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md px-2 md:p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="relative h-28 md:h-32 bg-slate-50 overflow-hidden flex-shrink-0 border-b border-slate-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50/30" />
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                        <div className="absolute right-4 top-4 md:right-6 md:top-6 z-10">
                            <button onClick={onClose} className="rounded-full bg-slate-200/50 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-90">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full px-6 md:px-10 pb-4 md:pb-6 flex items-end gap-4 md:gap-6">
                            <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-[2rem] bg-white p-1.5 shadow-2xl shadow-emerald-900/10 border border-slate-100 flex-shrink-0">
                                <div className="h-full w-full rounded-[1.6rem] bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl md:text-4xl font-black font-display shadow-inner">
                                    {patient.nombre?.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                                    <div className="h-full w-full rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Activity className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 pb-1 md:pb-2">
                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-display tracking-tight leading-none mb-1 md:mb-2">{patient.nombre}</h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Paciente Activo</span>
                                    {patient.tipo_sangre && (
                                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">{patient.tipo_sangre}</span>
                                    )}
                                    {patient.fecha_nac && (
                                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">{calcAge(patient.fecha_nac)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative px-6 md:px-10 py-6 md:py-8 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">

                            {/* Ficha Clínica */}
                            <div className="md:col-span-4 space-y-4">
                                <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <div className="h-1 w-4 bg-emerald-400 rounded-full" />
                                    Ficha Clínica
                                </h4>

                                <div className="space-y-2">
                                    <InfoCard icon={CreditCard} label="DNI / Identificación" value={patient.dni} />
                                    <InfoCard icon={CreditCard} label="CURP" value={patient.curp} />
                                    <InfoCard icon={User} label="Sexo" value={patient.sexo ? SEXO_LABEL[patient.sexo] : null} />
                                    <InfoCard icon={Calendar} label="Fecha de Nacimiento" value={patient.fecha_nac ? new Date(patient.fecha_nac + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                                    <InfoCard icon={Phone} label="Teléfono" value={patient.telefono} />
                                    <InfoCard icon={Mail} label="Email" value={patient.email} />
                                </div>

                                {/* Toggle more */}
                                <button
                                    onClick={() => setShowFullFicha(v => !v)}
                                    className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 py-1"
                                >
                                    {showFullFicha ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {showFullFicha ? 'Mostrar menos' : 'Ver expediente completo'}
                                </button>

                                <AnimatePresence>
                                    {showFullFicha && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2 overflow-hidden"
                                        >
                                            <InfoCard icon={Heart} label="Estado Civil" value={patient.estado_civil ? EC_LABEL[patient.estado_civil] : null} />
                                            <InfoCard icon={User} label="Ocupación" value={patient.ocupacion} />
                                            <InfoCard icon={MapPin} label="Domicilio" value={patient.domicilio} />
                                            <InfoCard icon={MapPin} label="Ciudad / Estado / CP" value={[patient.ciudad, patient.estado, patient.cp].filter(Boolean).join(', ') || null} />

                                            {/* Datos clínicos */}
                                            {(patient.tipo_sangre || patient.alergias || patient.padecimientos) && (
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Stethoscope className="h-3 w-3" />Antecedentes Clínicos</p>
                                                    <div className="space-y-2">
                                                        <InfoCard icon={Droplet} label="Tipo de Sangre" value={patient.tipo_sangre} />
                                                        {patient.alergias && (
                                                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                                                    <AlertTriangle className="h-3 w-3" />Alergias
                                                                </p>
                                                                <p className="text-xs font-bold text-amber-800">{patient.alergias}</p>
                                                            </div>
                                                        )}
                                                        {patient.padecimientos && (
                                                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Padecimientos Crónicos</p>
                                                                <p className="text-xs font-medium text-slate-600">{patient.padecimientos}</p>
                                                            </div>
                                                        )}
                                                        {patient.antecedentes && (
                                                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Antecedentes Heredofamiliares</p>
                                                                <p className="text-xs font-medium text-slate-600">{patient.antecedentes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2 p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100/50 mt-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="h-7 w-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase bg-white px-2 py-0.5 rounded-full shadow-sm">NOM-004 ✓</span>
                                                </div>
                                                <p className="text-[10px] font-medium text-emerald-800 leading-snug">
                                                    Expediente auditado bajo NOM-004-SSA3-2012 y NOM-024-SSA3-2010.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Clinical History Column */}
                            <div className="md:col-span-8 space-y-6">
                                {/* NIA Snapshot */}
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                            <Brain className="h-4 w-4" />
                                            Asistencia Inteligente
                                        </h4>
                                        {!snapshot && !isGeneratingSnapshot && (
                                            <button
                                                onClick={handleGenerateSnapshot}
                                                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all"
                                            >
                                                <Sparkles className="h-3 w-3 group-hover:rotate-12 transition-transform" />
                                                Snapshot Clínico
                                            </button>
                                        )}
                                    </div>

                                    {isGeneratingSnapshot && (
                                        <div className="flex flex-col items-center justify-center py-10 rounded-3xl border border-emerald-100 bg-emerald-50/30">
                                            <div className="relative h-12 w-12 mb-4">
                                                <div className="absolute inset-0 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                                                <Brain className="absolute inset-0 m-auto h-5 w-5 text-emerald-500 animate-pulse" />
                                            </div>
                                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest animate-pulse">Analizando historial médico...</p>
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {snapshot && !isGeneratingSnapshot && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            >
                                                <div className={`md:col-span-2 rounded-2xl p-5 border ${snapshot.safetyAlerts.hasAlerts ? 'bg-rose-50 border-rose-200' : 'bg-green-50/50 border-green-100'}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {snapshot.safetyAlerts.hasAlerts ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : <Activity className="h-4 w-4 text-green-500" />}
                                                        <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] ${snapshot.safetyAlerts.hasAlerts ? 'text-rose-600' : 'text-green-600'}`}>Alertas de Seguridad</h5>
                                                    </div>
                                                    <p className={`text-sm font-bold ${snapshot.safetyAlerts.hasAlerts ? 'text-rose-700' : 'text-green-700'}`}>{snapshot.safetyAlerts.notes}</p>
                                                </div>

                                                <div className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Activity className="h-4 w-4 text-sky-500" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado Actual</h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div><p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Motivo</p><p className="text-xs font-bold text-slate-700">{snapshot.snapshot.reason}</p></div>
                                                        <div><p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Diagnóstico</p><p className="text-xs font-bold text-slate-700">{snapshot.snapshot.diagnosis}</p></div>
                                                        <div><p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Estado</p><span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{snapshot.snapshot.status}</span></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl p-5 bg-slate-50 border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tendencias</h5>
                                                    </div>
                                                    <p className="text-xs font-medium leading-relaxed text-slate-600">{snapshot.trends}</p>
                                                </div>

                                                <div className="md:col-span-2 rounded-2xl p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Lightbulb className="h-4 w-4 text-emerald-100" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Próximo Paso Sugerido</h5>
                                                    </div>
                                                    <p className="text-sm font-bold leading-relaxed">{snapshot.suggestion}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Tabs: Historial / Crecimiento */}
                                <div className="flex gap-2 border-b border-slate-200 mb-6">
                                    <button
                                        onClick={() => setActiveTab('historial')}
                                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                                            activeTab === 'historial'
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        📋 Timeline Clínico
                                    </button>
                                    {patient.fecha_nac && (
                                        <button
                                            onClick={() => setActiveTab('crecimiento')}
                                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                                                activeTab === 'crecimiento'
                                                    ? 'border-emerald-500 text-emerald-600'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            📈 Crecimiento
                                        </button>
                                    )}
                                </div>

                                {/* Timeline (solo si activeTab === 'historial') */}
                                {activeTab === 'historial' && (
                                    <>
                                        <div className="flex items-center justify-between pb-4 mb-2">
                                            <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                <div className="h-4 w-1 bg-slate-200 rounded-full" />
                                                Eventos Médicos
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{history.length} Eventos</span>
                                        </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sincronizando historial...</p>
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((item, idx) => (
                                            <div key={item.id} className="relative pl-6 pb-2 last:pb-0">
                                                {idx !== history.length - 1 && (
                                                    <div className="absolute left-[3px] top-[14px] bottom-[-14px] w-[1px] bg-slate-100" />
                                                )}
                                                <div className={`absolute left-0 top-[6px] h-2 w-2 rounded-full ring-4 ring-white shadow-sm ${item._type === 'note' ? 'bg-amber-400' : 'bg-blue-400'}`} />

                                                <div className="p-4 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${item._type === 'note' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {item._type === 'note'
                                                                    ? (TIPO_NOTA_LABELS[item.tipo_nota] || 'Nota')
                                                                    : (item.tipo_consulta === 'primera_vez' ? 'Primera Vez' : item.tipo_consulta === 'urgencia' ? 'Urgencia' : 'Consulta')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-bold">
                                                                {new Date(item.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        {item._type === 'note' && item.firmada && (
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Firmada ✓</span>
                                                        )}
                                                    </div>

                                                    {item._type === 'note' ? (
                                                        <div className="space-y-1.5">
                                                            {item.subjetivo && <p className="text-xs text-slate-500"><span className="font-black text-slate-400">S:</span> {item.subjetivo}</p>}
                                                            {item.analisis && <p className="text-xs text-slate-700 font-bold"><span className="font-black text-slate-400">A:</span> {item.analisis}</p>}
                                                            {item.plan && <p className="text-xs text-slate-500"><span className="font-black text-slate-400">P:</span> {item.plan}</p>}
                                                            {!item.subjetivo && !item.analisis && !item.plan && item.diagnostico && (
                                                                <p className="text-sm font-medium text-slate-600 italic">"{item.diagnostico}"</p>
                                                            )}
                                                            {item.codigo_cie10 && (
                                                                <span className="inline-block text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{item.codigo_cie10}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-medium text-slate-600 italic">
                                                            "{item.motivo}"
                                                            {item.diagnostico && <span className="block text-xs font-bold text-slate-700 not-italic mt-1">Dx: {item.diagnostico}</span>}
                                                        </p>
                                                    )}
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
                                    </>
                                )}

                                {/* Tab de Crecimiento */}
                                {activeTab === 'crecimiento' && patient.fecha_nac && (
                                    <GrowthTab patient={patient} />
                                )}
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
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                                                    <ClipboardList className="h-4 w-4 text-white" />
                                                </div>
                                                <p className="text-sm font-black text-white uppercase tracking-widest">Nueva Nota Clínica</p>
                                            </div>
                                            <select
                                                value={soap.tipo_nota}
                                                onChange={e => setSoap(s => ({ ...s, tipo_nota: e.target.value }))}
                                                className="text-[10px] font-bold bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 focus:outline-none"
                                            >
                                                {Object.entries(TIPO_NOTA_LABELS).map(([v, l]) => (
                                                    <option key={v} value={v} className="text-slate-900">{l}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* SOAP Fields */}
                                        {[
                                            { key: 'subjetivo', label: 'S — Subjetivo', placeholder: 'Síntomas referidos por el paciente, motivo de consulta...' },
                                            { key: 'objetivo', label: 'O — Objetivo', placeholder: 'Exploración física, signos vitales, hallazgos...' },
                                            { key: 'analisis', label: 'A — Análisis / Diagnóstico', placeholder: 'Diagnóstico, interpretación clínica, código CIE-10...' },
                                            { key: 'plan', label: 'P — Plan', placeholder: 'Tratamiento, indicaciones, seguimiento, referencia...' },
                                        ].map(({ key, label, placeholder }) => (
                                            <div key={key}>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                                                <textarea
                                                    value={(soap as any)[key]}
                                                    onChange={e => setSoap(s => ({ ...s, [key]: e.target.value }))}
                                                    placeholder={placeholder}
                                                    className="w-full rounded-2xl bg-white/10 border border-white/20 p-4 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all font-medium placeholder:text-slate-500 resize-none"
                                                    rows={2}
                                                />
                                            </div>
                                        ))}

                                        <div className="flex justify-end gap-3 pt-1">
                                            <button onClick={() => setIsWritingNote(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
                                                Descartar
                                            </button>
                                            <button onClick={handleSaveNote} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all">
                                                <Send className="h-3 w-3" />
                                                Guardar Nota
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
                                        Nueva Nota SOAP
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
