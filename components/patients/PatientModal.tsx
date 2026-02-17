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

export default function PatientModal({ isOpen, onClose, onSuccess }: PatientModalProps) {
    const [nombre, setNombre] = useState('')
    const [dni, setDni] = useState('')
    const [telefono, setTelefono] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Debes estar autenticado para registrar pacientes')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('patients')
            .insert([
                {
                    nombre,
                    dni,
                    telefono,
                    user_id: user.id
                },
            ])

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            setNombre('')
            setDni('')
            setTelefono('')
            setLoading(false)
            toast.success('Paciente registrado correctamente')
            onSuccess()
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Registrar Paciente</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" /> Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="Ej. Juan Pérez"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-slate-400" /> DNI / Identificación
                        </label>
                        <input
                            type="text"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="12345678X"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" /> Teléfono
                        </label>
                        <input
                            type="tel"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="+52 951..."
                        />
                    </div>

                    {error && <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Registrando...' : 'Guardar Paciente'}
                    </button>
                </form>
            </div>
        </div>
    )
}
