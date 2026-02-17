'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, User, Clock, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'

interface AppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface Patient {
    id: string
    nombre: string
}

export default function AppointmentModal({ isOpen, onClose, onSuccess }: AppointmentModalProps) {
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

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Debes estar autenticado para agendar citas')
            setLoading(false)
            return
        }

        const { error: insertError } = await supabase
            .from('appointments')
            .insert([
                {
                    patient_id: patientId,
                    fecha,
                    motivo,
                    doctor_id: user.id,
                    estado: 'pendiente'
                },
            ])

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
        } else {
            setPatientId('')
            setFecha('')
            setMotivo('')
            setLoading(false)
            toast.success('Cita programada con éxito')
            onSuccess()
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Programar Cita</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" /> Seleccionar Paciente
                        </label>
                        <select
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            required
                        >
                            <option value="">Selecciona un paciente...</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" /> Fecha y Hora
                        </label>
                        <input
                            type="datetime-local"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <AlignLeft className="h-4 w-4 text-slate-400" /> Motivo de consulta
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="Ej. Chequeo general, Dolor de espalda..."
                            rows={3}
                        />
                    </div>

                    {error && <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading || !patientId}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Agendando...' : 'Confirmar Cita'}
                    </button>
                </form>
            </div>
        </div>
    )
}
