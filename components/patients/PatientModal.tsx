'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, CreditCard, Phone, MapPin, Heart, Calendar, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface PatientModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const FIELD_CLASS = (err?: string) =>
    `w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm focus:outline-none focus:ring-4 transition-all font-medium ${
        err ? 'border-red-300 focus:border-red-400 focus:ring-red-500/5'
            : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/5'
    }`

const SELECT_CLASS = (err?: string) =>
    `w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm focus:outline-none focus:ring-4 transition-all font-medium appearance-none ${
        err ? 'border-red-300 focus:border-red-400 focus:ring-red-500/5'
            : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/5'
    }`

export default function PatientModal({ isOpen, onClose, onSuccess }: PatientModalProps) {
    // Datos básicos
    const [nombre, setNombre]       = useState('')
    const [dni, setDni]             = useState('')
    const [curp, setCurp]           = useState('')
    const [telefono, setTelefono]   = useState('')
    const [email, setEmail]         = useState('')
    const [fechaNac, setFechaNac]   = useState('')
    const [sexo, setSexo]           = useState('')
    const [estadoCivil, setEstadoCivil] = useState('')
    const [ocupacion, setOcupacion] = useState('')
    // Domicilio
    const [domicilio, setDomicilio] = useState('')
    const [ciudad, setCiudad]       = useState('')
    const [estado, setEstado]       = useState('')
    const [cp, setCp]               = useState('')
    // Clínicos
    const [tipoSangre, setTipoSangre] = useState('')
    const [alergias, setAlergias]   = useState('')
    const [padecimientos, setPadecimientos] = useState('')

    const [tab, setTab]             = useState<'datos' | 'domicilio' | 'clinico'>('datos')
    const [loading, setLoading]     = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const clearErr = (k: string) => setFieldErrors(p => ({ ...p, [k]: '' }))

    const validate = () => {
        const errs: Record<string, string> = {}
        if (!nombre.trim() || nombre.trim().length < 2)
            errs.nombre = 'Mínimo 2 caracteres.'
        if (!dni.trim() || dni.trim().length < 6)
            errs.dni = 'Mínimo 6 caracteres.'
        if (curp.trim() && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp.trim().toUpperCase()))
            errs.curp = 'CURP inválido (18 caracteres).'
        if (telefono.trim() && !/^\+?[\d\s\-\(\)]{7,15}$/.test(telefono))
            errs.telefono = 'Formato inválido. Ej: +521234567890'
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            errs.email = 'Email inválido.'
        return errs
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs = validate()
        setFieldErrors(errs)
        if (Object.keys(errs).length > 0) {
            toast.error('Revisa los campos del formulario.')
            setTab('datos')
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('No autenticado'); setLoading(false); return }

        const { error } = await supabase.from('patients').insert([{
            user_id:      user.id,
            nombre:       nombre.trim(),
            dni:          dni.trim(),
            curp:         curp.trim().toUpperCase() || null,
            telefono:     telefono.trim() || null,
            email:        email.trim() || null,
            fecha_nac:    fechaNac || null,
            sexo:         sexo || null,
            estado_civil: estadoCivil || null,
            ocupacion:    ocupacion.trim() || null,
            domicilio:    domicilio.trim() || null,
            ciudad:       ciudad.trim() || null,
            estado:       estado.trim() || null,
            cp:           cp.trim() || null,
            tipo_sangre:  tipoSangre || null,
            alergias:     alergias.trim() || null,
            padecimientos: padecimientos.trim() || null,
        }])

        setLoading(false)
        if (error) {
            toast.error(error.message)
        } else {
            toast.success('Paciente registrado — NOM-004 ✓')
            onSuccess()
            onClose()
        }
    }

    const tabs = [
        { id: 'datos',     label: 'Identificación' },
        { id: 'domicilio', label: 'Domicilio' },
        { id: 'clinico',   label: 'Clínico' },
    ] as const

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] border border-slate-200 bg-white shadow-2xl overflow-hidden"
                    >
                        {/* Header + Tabs — sticky para que siempre sean visibles en mobile */}
                        <div className="sticky top-0 bg-white z-10">
                            <div className="flex items-center justify-between px-6 pt-6 pb-3">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Registrar Paciente</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">NOM-004-SSA3-2012 · Paso {tabs.findIndex(t => t.id === tab) + 1} de {tabs.length}</p>
                                </div>
                                <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-100 px-6">
                                {tabs.map((t, idx) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTab(t.id)}
                                        className={`pb-3 pt-1 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                                            tab === t.id
                                                ? 'border-emerald-500 text-emerald-600'
                                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black ${
                                            tab === t.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>{idx + 1}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

                                {/* ── Tab: Identificación ── */}
                                {tab === 'datos' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nombre Completo *</label>
                                            <input type="text" value={nombre} onChange={e => { setNombre(e.target.value); clearErr('nombre') }}
                                                className={FIELD_CLASS(fieldErrors.nombre)} placeholder="Juan Pérez López" />
                                            {fieldErrors.nombre && <p className="text-xs text-red-500">⚠ {fieldErrors.nombre}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> DNI / INE *</label>
                                                <input type="text" value={dni} onChange={e => { setDni(e.target.value); clearErr('dni') }}
                                                    className={FIELD_CLASS(fieldErrors.dni)} placeholder="ABCD123456" />
                                                {fieldErrors.dni && <p className="text-xs text-red-500">⚠ {fieldErrors.dni}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">CURP</label>
                                                <input type="text" value={curp} onChange={e => { setCurp(e.target.value.toUpperCase()); clearErr('curp') }}
                                                    className={FIELD_CLASS(fieldErrors.curp)} placeholder="PELJ800101..." maxLength={18} />
                                                {fieldErrors.curp && <p className="text-xs text-red-500">⚠ {fieldErrors.curp}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Fecha Nac.</label>
                                                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                                                    className={FIELD_CLASS()} />
                                            </div>
                                            <div className="space-y-1.5 relative">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sexo</label>
                                                <select value={sexo} onChange={e => setSexo(e.target.value)} className={SELECT_CLASS()}>
                                                    <option value="">Seleccionar</option>
                                                    <option value="M">Masculino</option>
                                                    <option value="F">Femenino</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 bottom-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Teléfono</label>
                                                <input type="tel" value={telefono} onChange={e => { setTelefono(e.target.value); clearErr('telefono') }}
                                                    className={FIELD_CLASS(fieldErrors.telefono)} placeholder="+52 951..." />
                                                {fieldErrors.telefono && <p className="text-xs text-red-500">⚠ {fieldErrors.telefono}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                                                <input type="email" value={email} onChange={e => { setEmail(e.target.value); clearErr('email') }}
                                                    className={FIELD_CLASS(fieldErrors.email)} placeholder="paciente@mail.com" />
                                                {fieldErrors.email && <p className="text-xs text-red-500">⚠ {fieldErrors.email}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5 relative">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado Civil</label>
                                                <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)} className={SELECT_CLASS()}>
                                                    <option value="">Seleccionar</option>
                                                    <option value="soltero">Soltero/a</option>
                                                    <option value="casado">Casado/a</option>
                                                    <option value="union_libre">Unión libre</option>
                                                    <option value="divorciado">Divorciado/a</option>
                                                    <option value="viudo">Viudo/a</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 bottom-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ocupación</label>
                                                <input type="text" value={ocupacion} onChange={e => setOcupacion(e.target.value)}
                                                    className={FIELD_CLASS()} placeholder="Empleado, estudiante..." />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Tab: Domicilio ── */}
                                {tab === 'domicilio' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Calle y Número</label>
                                            <input type="text" value={domicilio} onChange={e => setDomicilio(e.target.value)}
                                                className={FIELD_CLASS()} placeholder="Av. Independencia 123, Col. Centro" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ciudad</label>
                                                <input type="text" value={ciudad} onChange={e => setCiudad(e.target.value)}
                                                    className={FIELD_CLASS()} placeholder="Oaxaca" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</label>
                                                <input type="text" value={estado} onChange={e => setEstado(e.target.value)}
                                                    className={FIELD_CLASS()} placeholder="Oaxaca" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código Postal</label>
                                            <input type="text" value={cp} onChange={e => setCp(e.target.value)}
                                                className={FIELD_CLASS()} placeholder="68000" maxLength={5} />
                                        </div>
                                    </>
                                )}

                                {/* ── Tab: Clínico ── */}
                                {tab === 'clinico' && (
                                    <>
                                        <div className="space-y-1.5 relative">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Tipo de Sangre</label>
                                            <select value={tipoSangre} onChange={e => setTipoSangre(e.target.value)} className={SELECT_CLASS()}>
                                                <option value="">Desconocido</option>
                                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 bottom-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alergias conocidas</label>
                                            <textarea value={alergias} onChange={e => setAlergias(e.target.value)} rows={2}
                                                className={FIELD_CLASS() + ' resize-none'} placeholder="Penicilina, aspirina, látex..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Antecedentes / Padecimientos crónicos</label>
                                            <textarea value={padecimientos} onChange={e => setPadecimientos(e.target.value)} rows={3}
                                                className={FIELD_CLASS() + ' resize-none'} placeholder="Diabetes, HTA, cardiopatía, cirugías previas..." />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex gap-3">
                                {tab !== 'datos' && (
                                    <button type="button" onClick={() => setTab(tab === 'clinico' ? 'domicilio' : 'datos')}
                                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                        ← Anterior
                                    </button>
                                )}
                                {tab !== 'clinico' ? (
                                    <button type="button" onClick={() => setTab(tab === 'datos' ? 'domicilio' : 'clinico')}
                                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition-all">
                                        Siguiente →
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading}
                                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/10 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all">
                                        {loading ? 'Guardando...' : '✓ Guardar Paciente'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
