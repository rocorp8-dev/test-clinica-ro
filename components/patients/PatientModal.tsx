'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, CreditCard, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface PatientModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

import { motion, AnimatePresence } from 'framer-motion'

export default function PatientModal({ isOpen, onClose, onSuccess }: PatientModalProps) {
    const [nombre, setNombre] = useState('')
    const [dni, setDni] = useState('')
    const [telefono, setTelefono] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const errs: Record<string, string> = {}
        if (!nombre.trim() || nombre.trim().length < 2)
            errs.nombre = 'El nombre debe tener al menos 2 caracteres.'
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(nombre))
            errs.nombre = 'El nombre solo puede contener letras y espacios.'
        if (!dni.trim() || dni.trim().length < 6)
            errs.dni = 'El DNI/ID debe tener al menos 6 caracteres.'
        if (telefono.trim() && !/^\+?[\d\s\-\(\)]{7,15}$/.test(telefono))
            errs.telefono = 'Formato de teléfono inválido. Ej: +521234567890'
        return errs
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // ── Validación de campos ────────────────────────────
        const errs = validate()
        setFieldErrors(errs)
        if (Object.keys(errs).length > 0) {
            toast.error('Revisa los campos del formulario.')
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Debes estar autenticado para registrar pacientes')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('patients')
            .insert([{ nombre: nombre.trim(), dni: dni.trim(), telefono: telefono.trim(), user_id: user.id }])

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            setNombre('')
            setDni('')
            setTelefono('')
            setFieldErrors({})
            setLoading(false)
            toast.success('Paciente registrado correctamente')
            onSuccess()
            onClose()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-md p-x-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-md rounded-t-[2.5rem] md:rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-display">Registrar Paciente</h3>
                                <p className="text-xs text-slate-400 mt-1">Ingresa los datos del nuevo miembro</p>
                            </div>
                            <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 transition-colors border border-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="h-4 w-4" /> Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => { setNombre(e.target.value); setFieldErrors(p => ({ ...p, nombre: '' })) }}
                                    className={`w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm focus:outline-none focus:ring-4 transition-all font-medium ${fieldErrors.nombre ? 'border-red-300 focus:border-red-400 focus:ring-red-500/5' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/5'
                                        }`}
                                    placeholder="Ej. Juan Pérez"
                                />
                                {fieldErrors.nombre && <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">⚠ {fieldErrors.nombre}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" /> DNI / Identificación
                                </label>
                                <input
                                    type="text"
                                    value={dni}
                                    onChange={(e) => { setDni(e.target.value); setFieldErrors(p => ({ ...p, dni: '' })) }}
                                    className={`w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm focus:outline-none focus:ring-4 transition-all font-medium ${fieldErrors.dni ? 'border-red-300 focus:border-red-400 focus:ring-red-500/5' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/5'
                                        }`}
                                    placeholder="12345678X"
                                />
                                {fieldErrors.dni && <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">⚠ {fieldErrors.dni}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => { setTelefono(e.target.value); setFieldErrors(p => ({ ...p, telefono: '' })) }}
                                    className={`w-full rounded-2xl border bg-slate-50/50 px-4 py-3.5 text-sm focus:outline-none focus:ring-4 transition-all font-medium ${fieldErrors.telefono ? 'border-red-300 focus:border-red-400 focus:ring-red-500/5' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/5'
                                        }`}
                                    placeholder="+52 951..."
                                />
                                {fieldErrors.telefono && <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">⚠ {fieldErrors.telefono}</p>}
                            </div>

                            {error && <p className="text-xs font-medium text-red-500 bg-red-50/50 p-3 rounded-xl border border-red-100">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/10 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Registrando...' : 'Guardar Paciente'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
