'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
    FileText, Search, Database, Lock, User, Calendar, ClipboardList,
    ChevronRight, Loader2, FileDown, X, AlertTriangle, Droplet, MapPin,
    Shield, Stethoscope
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const TIPO_NOTA: Record<string, string> = {
    primera_vez: 'Primera Vez', evolucion: 'Evolución', urgencias: 'Urgencias',
    referencia: 'Referencia', interconsulta: 'Interconsulta', egreso: 'Egreso',
    enfermeria: 'Enfermería', quirurgica: 'Quirúrgica', ingreso: 'Ingreso', contrarreferencia: 'Contrarreferencia',
}
const SEXO: Record<string, string> = { M: 'Masculino', F: 'Femenino', otro: 'Otro' }
const EC: Record<string, string> = { soltero: 'Soltero/a', casado: 'Casado/a', divorciado: 'Divorciado/a', viudo: 'Viudo/a', union_libre: 'Unión libre', otro: 'Otro' }

function calcAge(fecha_nac?: string) {
    if (!fecha_nac) return null
    return Math.floor((Date.now() - new Date(fecha_nac).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

export default function RecordsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<any>(null)
    const [notes, setNotes] = useState<any[]>([])
    const [appointments, setAppointments] = useState<any[]>([])
    const [loadingList, setLoadingList] = useState(true)
    const [loadingExp, setLoadingExp] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoadingList(true)
            const { data } = await supabase.from('patients').select('*').order('nombre')
            setPatients(data || [])
            setLoadingList(false)
        }
        load()
    }, [])

    const loadExpediente = useCallback(async (patient: any) => {
        setSelected(patient)
        setLoadingExp(true)
        const [notesRes, appsRes] = await Promise.all([
            supabase.from('medical_notes').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
            supabase.from('appointments').select('*').eq('patient_id', patient.id).order('fecha', { ascending: false }),
        ])
        setNotes(notesRes.data || [])
        setAppointments(appsRes.data || [])
        setLoadingExp(false)
    }, [])

    const filtered = patients.filter(p =>
        p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.dni?.toLowerCase().includes(search.toLowerCase()) ||
        p.curp?.toLowerCase().includes(search.toLowerCase())
    )

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 font-display">Expedientes Electrónicos</h1>
                    <p className="text-slate-500 text-sm">NOM-004-SSA3-2012 · NOM-024-SSA3-2010</p>
                </div>
                {selected && (
                    <button
                        onClick={handlePrint}
                        className="print:hidden flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <FileDown className="h-4 w-4" />
                        Exportar PDF
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
                {/* Patient List */}
                <div className="print:hidden w-full md:w-72 flex-shrink-0 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, DNI o CURP..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {loadingList ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-8">Sin resultados</p>
                        ) : (
                            filtered.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => loadExpediente(p)}
                                    className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all mb-1 ${selected?.id === p.id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                                        {p.nombre?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{p.nombre}</p>
                                        <p className="text-[11px] text-slate-400 font-mono">{p.dni}</p>
                                    </div>
                                    {selected?.id === p.id && <ChevronRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-50 flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        <p className="text-[10px] text-slate-400 font-bold">{patients.length} pacientes · RLS activo</p>
                    </div>
                </div>

                {/* Expediente Viewer */}
                <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-y-auto">
                    {!selected ? (
                        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
                            <div className="relative mb-6">
                                <div className="h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Database className="h-10 w-10" />
                                </div>
                                <div className="absolute -right-1 -top-1 rounded-full bg-slate-900 p-1.5 border-4 border-white">
                                    <Lock className="h-3 w-3 text-white" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">Selecciona un paciente</h2>
                            <p className="max-w-sm text-slate-400 text-sm leading-relaxed">
                                Elige un paciente del listado para visualizar su expediente clínico electrónico completo.
                            </p>
                        </div>
                    ) : loadingExp ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Cargando expediente...</p>
                        </div>
                    ) : (
                        <div className="p-6 md:p-10 space-y-10">

                            {/* Header del expediente — visible en print */}
                            <div className="hidden print:flex items-center gap-4 pb-6 border-b-2 border-slate-200">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Expediente Clínico Electrónico</p>
                                    <p suppressHydrationWarning className="text-xs text-slate-400">NOM-004-SSA3-2012 · NOM-024-SSA3-2010 · Generado: {new Date().toLocaleDateString('es-MX')}</p>
                                </div>
                            </div>

                            {/* Encabezado del paciente */}
                            <div className="flex items-start gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
                                    {selected.nombre?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-slate-900 font-display">{selected.nombre}</h2>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Expediente Activo</span>
                                        {selected.tipo_sangre && <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">{selected.tipo_sangre}</span>}
                                        {selected.fecha_nac && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{calcAge(selected.fecha_nac)} años</span>}
                                        {selected.sexo && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{SEXO[selected.sexo]}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Sección 1: Identificación */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    I. Datos de Identificación — NOM-004 §7.1
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { label: 'Nombre Completo', value: selected.nombre },
                                        { label: 'DNI / Identificación', value: selected.dni },
                                        { label: 'CURP', value: selected.curp },
                                        { label: 'Fecha de Nacimiento', value: selected.fecha_nac ? new Date(selected.fecha_nac + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
                                        { label: 'Sexo', value: selected.sexo ? SEXO[selected.sexo] : null },
                                        { label: 'Estado Civil', value: selected.estado_civil ? EC[selected.estado_civil] : null },
                                        { label: 'Ocupación', value: selected.ocupacion },
                                        { label: 'Teléfono', value: selected.telefono },
                                        { label: 'Email', value: selected.email },
                                        { label: 'Domicilio', value: selected.domicilio },
                                        { label: 'Ciudad', value: selected.ciudad },
                                        { label: 'Estado / CP', value: [selected.estado, selected.cp].filter(Boolean).join(' ') || null },
                                    ].filter(f => f.value).map(({ label, value }) => (
                                        <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                            <p className="text-sm font-bold text-slate-800">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Sección 2: Antecedentes Clínicos */}
                            {(selected.tipo_sangre || selected.alergias || selected.padecimientos || selected.antecedentes) && (
                                <section>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4" />
                                        II. Antecedentes Clínicos — NOM-004 §7.2
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selected.tipo_sangre && (
                                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                                                <Droplet className="h-5 w-5 text-rose-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Grupo Sanguíneo</p>
                                                    <p className="text-lg font-black text-rose-700">{selected.tipo_sangre}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selected.alergias && (
                                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Alergias</p>
                                                </div>
                                                <p className="text-sm font-bold text-amber-800">{selected.alergias}</p>
                                            </div>
                                        )}
                                        {selected.padecimientos && (
                                            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Padecimientos Crónicos</p>
                                                <p className="text-sm text-slate-700">{selected.padecimientos}</p>
                                            </div>
                                        )}
                                        {selected.antecedentes && (
                                            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Antecedentes Heredofamiliares</p>
                                                <p className="text-sm text-slate-700">{selected.antecedentes}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Sección 3: Notas Médicas */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    III. Notas Clínicas — NOM-004 §8
                                    <span className="ml-auto text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">{notes.length} notas</span>
                                </h3>
                                {notes.length === 0 ? (
                                    <div className="text-center py-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100">
                                        <p className="text-sm text-slate-400 font-bold">Sin notas clínicas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {notes.map(note => (
                                            <div key={note.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm print:border print:border-slate-200 print:shadow-none">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                                                            {TIPO_NOTA[note.tipo_nota] || note.tipo_nota}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-bold">
                                                            {new Date(note.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {note.codigo_cie10 && (
                                                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{note.codigo_cie10}</span>
                                                        )}
                                                        {note.firmada && (
                                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Firmada ✓</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {note.subjetivo && (
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">S — Subjetivo</p>
                                                            <p className="text-sm text-slate-700">{note.subjetivo}</p>
                                                        </div>
                                                    )}
                                                    {note.objetivo && (
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">O — Objetivo</p>
                                                            <p className="text-sm text-slate-700">{note.objetivo}</p>
                                                        </div>
                                                    )}
                                                    {note.analisis && (
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A — Análisis / Diagnóstico</p>
                                                            <p className="text-sm font-bold text-slate-800">{note.analisis}</p>
                                                        </div>
                                                    )}
                                                    {note.plan && (
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">P — Plan</p>
                                                            <p className="text-sm text-slate-700">{note.plan}</p>
                                                        </div>
                                                    )}
                                                    {!note.subjetivo && !note.objetivo && !note.analisis && !note.plan && note.diagnostico && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnóstico</p>
                                                            <p className="text-sm text-slate-700">{note.diagnostico}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Signos vitales */}
                                                {(note.tension_sistolica || note.frecuencia_cardiaca || note.temperatura || note.peso_kg) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-3">
                                                        {note.tension_sistolica && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">TA: {note.tension_sistolica}/{note.tension_diastolica} mmHg</span>}
                                                        {note.frecuencia_cardiaca && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">FC: {note.frecuencia_cardiaca} bpm</span>}
                                                        {note.temperatura && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">T°: {note.temperatura}°C</span>}
                                                        {note.peso_kg && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">Peso: {note.peso_kg} kg</span>}
                                                        {note.spo2 && <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">SpO2: {note.spo2}%</span>}
                                                    </div>
                                                )}

                                                {note.cedula_prof && (
                                                    <p className="mt-3 text-[10px] text-slate-400 font-bold">Cédula Prof.: {note.cedula_prof}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Sección 4: Citas */}
                            {appointments.length > 0 && (
                                <section>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        IV. Historial de Consultas
                                        <span className="ml-auto text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">{appointments.length} citas</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {appointments.map(a => (
                                            <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="text-center min-w-[3rem]">
                                                    <p className="text-xs font-black text-slate-600">{new Date(a.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(a.fecha).getFullYear()}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-700">{a.motivo || '—'}</p>
                                                    {a.diagnostico && <p className="text-xs text-slate-500">Dx: {a.diagnostico}</p>}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${a.estado === 'completada' ? 'bg-green-100 text-green-700' : a.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {a.estado || 'pendiente'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Footer legal — print only */}
                            <div className="hidden print:block pt-8 border-t border-slate-200 text-center">
                                <p suppressHydrationWarning className="text-[10px] text-slate-400">Expediente generado por MdPulso · Documento confidencial sujeto a NOM-004-SSA3-2012 · {new Date().toLocaleString('es-MX')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
